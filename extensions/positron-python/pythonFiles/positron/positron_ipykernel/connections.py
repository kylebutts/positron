#
# Copyright (C) 2024 Posit Software, PBC. All rights reserved.
#
from __future__ import annotations

import logging
import uuid
from typing import TYPE_CHECKING, Any, Dict, List, Optional, TypedDict, Union

import comm

from .connections_comm import (
    ConnectionsBackendMessageContent,
    ContainsDataRequest,
    GetIconRequest,
    ListFieldsRequest,
    ListObjectsRequest,
    ObjectSchema,
    PreviewObjectRequest,
)
from .positron_comm import CommMessage, JsonRpcErrorCode, PositronComm
from .third_party import pd_, sqlalchemy_
from .utils import JsonData, JsonRecord, safe_isinstance

if TYPE_CHECKING:
    import sqlite3

    import sqlalchemy
    from comm.base_comm import BaseComm

    from .positron_ipkernel import PositronIPyKernel


logger = logging.getLogger(__name__)


class ConnectionObjectInfo(TypedDict):
    icon: Optional[str]
    contains: Union[Dict[str, "ConnectionObjectInfo"], Optional[str]]


class ConnectionObject(TypedDict):
    name: str
    kind: str


class ConnectionObjectFields(TypedDict):
    name: str
    dtype: str


class Connection:
    """
    Base class representing a connection to a data source.
    """

    type: str
    host: str
    display_name: Optional[str] = None
    icon: Optional[str] = None
    conn: Any = None
    actions: Any = None

    def disconnect(self) -> None:
        "Callback executed when the connection is closed in the UI."
        raise NotImplementedError()

    def list_object_types(self) -> Dict[str, ConnectionObjectInfo]:
        """
        Returns a dictionary of object types and their properties.

        We expect the `contains` to be the string `"data"` if the object
        contains data (eg is a table or a view). `contains` can also
        be a dictionary listing sub objects in the hirarchy in this same
        format, but this is currently not used.

        The `icon` property is the path to an icon to be used by the UI.
        """
        raise NotImplementedError()

    def list_objects(self, path: List[ObjectSchema]) -> List[ConnectionObject]:
        """
        Returns the list of objects at the given path.

        The returned object is a list of dictionaries with the:
        - name: The name of the object.
        - kind: The kind of the object.

        Args:
            path: The path to the object.
        """
        raise NotImplementedError()

    def list_fields(self, path: List[ObjectSchema]) -> List[ConnectionObjectFields]:
        """
        Returns the list of fields for the given object.

        The returned object is a list of dictionaries with the:
        - name: The name of the field.
        - dtype: The data type of the field.

        Args:
            path: The path to the object.
        """
        raise NotImplementedError()

    def preview_object(self, path: List[ObjectSchema]) -> Any:
        """
        Returns a small sample of the object's data for previewing.

        The returned object must be a pandas dataframe or other types of
        objects that can be previewed with Positron's Data Explorer.

        Args:
            path: The path to the object.
        """
        raise NotImplementedError()


class ConnectionsService:
    """
    A service that manages connections to data sources.
    """

    def __init__(self, kernel: PositronIPyKernel, comm_target_name: str):
        self.comms: Dict[str, PositronComm] = {}
        self.comm_id_to_connection: Dict[str, Connection] = {}
        self._kernel = kernel
        self._comm_target_name = comm_target_name

    def register_connection(self, connection: Any) -> str:
        """
        Opens a connection to the given data source.

        Args:
            connection: A subclass of Connection implementing the
              necessary methods.
        """

        if not isinstance(connection, Connection):
            connection = self._wrap_connection(connection)

        # check if there's already a connection registered with the same type and host
        # just like RStudio we use the `type` and `host` properties to identify the connection
        # and we don't allow multiple connections to the same data source.
        # https://github.com/rstudio/rstudio/blob/2344a0bf04657a13c36053eb04bcc47616a623dc/src/cpp/session/modules/SessionConnections.R#L52-L53
        for comm_id, conn in self.comm_id_to_connection.items():
            if conn.type == connection.type and conn.host == connection.host:
                logger.info(
                    "Connection to host '%s' of type '%s' already opened with comm_id '%s'",
                    conn.host,
                    conn.type,
                    comm_id,
                )
                return comm_id

        comm_id = str(uuid.uuid4())
        base_comm = comm.create_comm(
            target_name=self._comm_target_name,
            comm_id=comm_id,
            data={"name": connection.display_name},
        )

        self.comm_id_to_connection[comm_id] = connection
        self.on_comm_open(base_comm)
        return comm_id

    def on_comm_open(self, comm: BaseComm):
        comm_id = comm.comm_id
        comm.on_close(lambda msg: self._close_connection(comm_id))
        connections_comm = PositronComm(comm)
        connections_comm.on_msg(self.handle_msg, ConnectionsBackendMessageContent)
        self.comms[comm_id] = connections_comm

    def _wrap_connection(self, obj: Any) -> Connection:
        # we don't want to import sqlalchemy for that
        type_name = type(obj).__name__

        if safe_isinstance(obj, "sqlite3", "Connection"):
            return SQLite3Connection(obj)
        elif safe_isinstance(obj, "sqlalchemy", "Engine"):
            return SQLAlchemyConnection(obj)

        raise ValueError(f"Unsupported connection type {type_name}")

    def _close_connection(self, comm_id: str):

        try:
            # calling disconnect can fail if the connection has already been closed or
            # if it's called from a different thread.
            # however, this shound't be fatal as we won't use it anymore in the connections
            # pane.
            self.comm_id_to_connection[comm_id].disconnect()
        except Exception as err:
            logger.warning(err, exc_info=True)

        try:
            self.comms[comm_id].close()
        except Exception as err:
            logger.warning(err, exc_info=True)

        del self.comms[comm_id]
        del self.comm_id_to_connection[comm_id]

    def shutdown(self):
        """
        Closes all comms and runs the `disconnect` callback.
        """
        for comm_id in self.comms.keys():
            self._close_connection(comm_id)

        self.comms = {}  # implicitly deleting comms
        self.comm_id_to_connection = {}

    def handle_msg(
        self, msg: CommMessage[ConnectionsBackendMessageContent], raw_msg: JsonRecord
    ) -> None:
        """
        Handles messages from the frontend.
        """

        try:
            return self._handle_msg(msg, raw_msg)
        except Exception as err:
            # Any exception when handling messages is forwarded to the frontend which
            # will display an error message in the UI if fatal.

            try:
                comm_id = msg.content.comm_id
            except AttributeError:
                logger.error(
                    "Failed to process positron.connection request. No comm_id found in the message."
                )
                return

            logger.warning(err, exc_info=True)
            self.comms[comm_id].send_error(
                JsonRpcErrorCode.INTERNAL_ERROR,
                f"Failed process positron.connection request: {err}",
            )

    def _handle_msg(
        self, msg: CommMessage[ConnectionsBackendMessageContent], raw_msg: JsonRecord
    ) -> None:
        comm_id = msg.content.comm_id
        request = msg.content.data
        connection = self.comm_id_to_connection[comm_id]
        comm = self.comms[comm_id]

        result: JsonData = None
        if isinstance(request, ContainsDataRequest):
            result = self.handle_contains_data_request(connection, request)
        elif isinstance(request, ListObjectsRequest):
            # both list_objects_request and list_fields_request return list of
            # TypedDict objects that only contain strings. But pyright is not
            # able to infer that.
            result = self.handle_list_objects_request(connection, request)  # type: ignore
        elif isinstance(request, ListFieldsRequest):
            result = self.handle_list_fields_request(connection, request)  # type: ignore
        elif isinstance(request, GetIconRequest):
            result = self.handle_get_icon_request(connection, request)
        elif isinstance(request, PreviewObjectRequest):
            self.handle_preview_object_request(connection, request)
            result = None
        else:
            raise NotImplementedError(f"Unhandled request: {request}")

        comm.send_result(result)

    def handle_contains_data_request(self, conn: Connection, request: ContainsDataRequest) -> bool:
        path = request.params.path
        if len(path) == 0:
            return False

        object_types: Dict[str, Any] = conn.list_object_types()
        contains = object_types[path[-1].kind].get("contains", "not_data")
        return isinstance(contains, str) and contains == "data"

    def handle_get_icon_request(self, conn: Connection, request: GetIconRequest) -> str:
        path = request.params.path

        icon = None
        if len(path) == 0:
            icon = getattr(conn, "icon", None)
        else:
            object_types: Dict[str, Any] = conn.list_object_types()
            icon = object_types[path[-1].kind].get("icon", "")

        if icon is None:
            return ""
        return icon

    def handle_list_objects_request(
        self, conn: Connection, request: ListObjectsRequest
    ) -> List[ConnectionObject]:
        return conn.list_objects(request.params.path)

    def handle_list_fields_request(
        self, conn: Connection, request: ListFieldsRequest
    ) -> List[ConnectionObjectFields]:
        return conn.list_fields(request.params.path)

    def handle_preview_object_request(
        self, conn: Connection, request: PreviewObjectRequest
    ) -> None:
        res = conn.preview_object(request.params.path)
        title = request.params.path[-1].name
        self._kernel.data_explorer_service.register_table(res, title)


class SQLite3Connection(Connection):
    """
    Support for sqlite3 connections to databases.
    """

    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn
        self.display_name = "SQLite Connection"
        self.host = self._find_path(conn)
        self.type = "SQLite"

    def _find_path(self, conn: sqlite3.Connection):
        """
        Find the path to the database file or the in-memory database.
        The path is used as the `host` property and is important to indentify
        a unique sqlite3 connection.
        """
        cursor = conn.cursor()
        cursor.execute("PRAGMA database_list;")
        # this returns a tuple containing row_number, databasename and filepath
        row = cursor.fetchone()
        return row[2]

    def list_objects(self, path: List[ObjectSchema]):
        if len(path) == 0:
            # we are at the root of the database, thus we return the list of attached 'databases'
            # in general there's only `main` and `temp` but it seems users can attach other
            # dbs to the connection
            res = self.conn.cursor().execute("PRAGMA database_list;")
            schemas: List[ConnectionObject] = []
            for _, name, _ in res.fetchall():
                schemas.append(ConnectionObject({"name": name, "kind": "schema"}))
            return schemas

        if len(path) == 1:
            # we must have a schema on the path. and we return the list of tables and views
            # in that schema
            schema = path[0]
            if schema.kind != "schema":
                raise ValueError(
                    f"Invalid path. Expected it to include a schema, but got '{schema.kind}'",
                    f"Path: {path}",
                )

            # https://www.sqlite.org/schematab.html
            res = self.conn.cursor().execute(
                f"""
                SELECT name, type FROM {schema.name}.sqlite_schema WHERE type IN ('table', 'view');
                """
            )

            tables: List[ConnectionObject] = []
            for name, kind in res.fetchall():
                # We drop the internal schema objects as defined in:
                # https://www.sqlite.org/fileformat.html#internal_schema_objects
                # ie, objects that start with `sqlite_`
                if name.startswith("sqlite_"):
                    continue
                tables.append(ConnectionObject({"name": name, "kind": kind}))

            return tables

        # there is no additional hierarchies in SQLite databases. If we get to this point
        # it means the path is invalid.
        raise ValueError(f"Path length must be at most 1, but got {len(path)}. Path: {path}")

    def list_fields(self, path: List[ObjectSchema]):
        if len(path) != 2:
            raise ValueError(f"Path length must be 2, but got {len(path)}. Path: {path}")

        schema, table = path
        if schema.kind != "schema" or table.kind not in ["table", "view"]:
            raise ValueError(
                "Path must include a schema and a table/view in this order.", f"Path: {path}"
            )

        # https://www.sqlite.org/pragma.html#pragma_table_info
        res = self.conn.cursor().execute(f"PRAGMA {schema.name}.table_info({table.name});")
        fields: List[ConnectionObjectFields] = []
        for _, name, dtype, _, _, _ in res.fetchall():
            fields.append(ConnectionObjectFields({"name": name, "dtype": dtype}))

        return fields

    def disconnect(self):
        self.conn.close()

    def preview_object(self, path: List[ObjectSchema]):

        if pd_ is None:
            raise ModuleNotFoundError("Pandas is required for previewing SQLite tables.")

        if len(path) != 2:
            raise ValueError(f"Path length must be 2, but got {len(path)}. Path: {path}")

        schema, table = path
        if schema.kind != "schema" or table.kind not in ["table", "view"]:
            raise ValueError(
                "Path must include a schema and a table/view in this order.", f"Path: {path}"
            )

        return pd_.read_sql(
            f"SELECT * FROM {schema.name}.{table.name} LIMIT 1000;",
            self.conn,
        )

    def list_object_types(self):
        return {
            "table": ConnectionObjectInfo({"contains": "data", "icon": None}),
            "view": ConnectionObjectInfo({"contains": "data", "icon": None}),
            "schema": ConnectionObjectInfo({"contains": None, "icon": None}),
            "database": ConnectionObjectInfo({"contains": None, "icon": None}),
        }


class SQLAlchemyConnection(Connection):
    """
    Support for SQLAlchemy connections to databases.
    """

    def __init__(self, conn):

        self.conn: sqlalchemy.Engine = conn
        self.display_name = f"SQLAlchemy ({conn.name})"
        self.host = conn.url
        self.type = "SQLAlchemy"

    def list_objects(self, path: List[ObjectSchema]):

        if sqlalchemy_ is None:
            raise ModuleNotFoundError(
                "SQLAlchemy is required for listing objects in SQLAlchemy connections."
            )

        if len(path) == 0:
            # we at the root of the database so we return the list of schemas
            schemas = sqlalchemy_.inspect(self.conn).get_schema_names()
            return [ConnectionObject({"name": name, "kind": "schema"}) for name in schemas]

        if len(path) == 1:
            # we must have a schema on the path. and we return the list of tables and views
            # in that schema
            schema = path[0]
            if schema.kind != "schema":
                raise ValueError(
                    f"Invalid path. Expected it to include a schema, but got '{schema.kind}'",
                    f"Path: {path}",
                )

            tables = sqlalchemy_.inspect(self.conn).get_table_names(schema.name)
            views = sqlalchemy_.inspect(self.conn).get_view_names(schema.name)
            return [ConnectionObject({"name": name, "kind": "table"}) for name in tables] + [
                ConnectionObject({"name": name, "kind": "view"}) for name in views
            ]

        raise ValueError(f"Path length must be at most 1, but got {len(path)}. Path: {path}")

    def list_fields(self, path: List[ObjectSchema]):

        if sqlalchemy_ is None:
            raise ModuleNotFoundError(
                "SQLAlchemy is required for listing fields in SQLAlchemy connections."
            )

        self._check_table_path(path)

        schema, table = path
        fields = sqlalchemy_.inspect(self.conn).get_columns(
            schema_name=schema.name, table_name=table.name
        )
        return [
            ConnectionObjectFields({"name": field["name"], "dtype": str(field["type"])})
            for field in fields
        ]

    def list_object_types(self):
        return {
            "table": ConnectionObjectInfo({"contains": "data", "icon": None}),
            "view": ConnectionObjectInfo({"contains": "data", "icon": None}),
            "schema": ConnectionObjectInfo({"contains": None, "icon": None}),
            "database": ConnectionObjectInfo({"contains": None, "icon": None}),
        }

    def preview_object(self, path: List[ObjectSchema]):

        if sqlalchemy_ is None:
            raise ModuleNotFoundError(
                "SQLAlchemy is required for previewing objects in SQLAlchemy connections."
            )

        if pd_ is None:
            raise ModuleNotFoundError("Pandas is required for previewing SQLAlchemy tables.")

        self._check_table_path(path)
        schema, table = path

        table = sqlalchemy_.Table(
            table.name, sqlalchemy_.MetaData(), autoload_with=self.conn, schema=schema.name
        )
        stmt = sqlalchemy_.sql.select(table).limit(1000)
        # using conn.connect() is safer then using the conn directly and is also supported
        # with older pandas versions such as 1.5
        return pd_.read_sql(stmt, self.conn.connect())

    def disconnect(self):
        self.conn.dispose()

    def _check_table_path(self, path: List[ObjectSchema]):
        if len(path) != 2:
            raise ValueError(
                f"Invalid path. Length path ({len(path)}) expected to be 2.", f"Path: {path}"
            )

        schema, table = path
        if schema.kind != "schema" or table.kind not in ["table", "view"]:
            raise ValueError(
                "Invalid path. Expected path to contain a schema and a table/view.",
                f"But got schema.kind={schema.kind} and table.kind={table.kind}",
            )