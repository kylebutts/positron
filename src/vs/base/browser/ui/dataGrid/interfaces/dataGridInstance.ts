/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2023-2024 Posit Software, PBC. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/base/common/event';
import { IDataColumn } from 'vs/base/browser/ui/dataGrid/interfaces/dataColumn';
import { IColumnSortKey } from 'vs/base/browser/ui/dataGrid/interfaces/columnSortKey';

/**
 * SelectionState enumeration.
 */
export enum SelectionState {
	None = 0,
	Selected = 1,
	FirstSelected = 2,
	LastSelected = 4
}

/**
 * MouseSelectionType enumeration.
 */
export enum MouseSelectionType {
	Single = 'single',
	Range = 'range',
	Multi = 'multi'
}

/**
 * IDataGridInstance interface.
 */
export interface IDataGridInstance {
	/**
	 * Gets the column headers height.
	 */
	readonly columnHeadersHeight: number;

	/**
	 * Gets the row headers width.
	 */
	readonly rowHeadersWidth: number;

	/**
	 * Gets the minimum column width.
	 */
	readonly minimumColumnWidth: number;

	/**
	 * Gets the row height.
	 */
	readonly rowHeight: number;

	/**
	 * Gets the scrollbar width.
	 */
	readonly scrollbarWidth: number;

	/**
	 * Gets the number of columns.
	 */
	readonly columns: number;

	/**
	 * Gets the number of rows.
	 */
	readonly rows: number;

	/**
	 * Gets the layout width.
	 */
	readonly layoutWidth: number;

	/**
	 * Gets the layout height.
	 */
	readonly layoutHeight: number;

	/**
	 * Gets the visible rows.
	 */
	readonly visibleRows: number;

	/**
	 * Gets the visible columns.
	 */
	readonly visibleColumns: number;

	/**
	 * Gets the maximum first column.
	 */
	readonly maximumFirstColumnIndex: number;

	/**
	 * Gets the maximum first row.
	 */
	readonly maximumFirstRowIndex: number;

	/**
	 * Gets or sets the first column index.
	 */
	readonly firstColumnIndex: number;

	/**
	 * Gets or sets the first row index.
	 */
	readonly firstRowIndex: number;

	/**
	 * Gets the cursor column index.
	 */
	readonly cursorColumnIndex: number;

	/**
	 * Gets the cursor row.
	 */
	readonly cursorRowIndex: number;

	/**
	 * Sets the columns.
	 * @param columns The columns.
	 */
	setColumns(columns: IDataColumn[]): void;

	/**
	 * Sets the width of a column.
	 * @param columnIndex The column index.
	 * @param width The width.
	 */
	setColumnWidth(columnIndex: number, width: number): void;

	/**
	 * Sets the row headers width.
	 * @param rowHeadersWidth The row headers width.
	 */
	setRowHeadersWidth(rowHeadersWidth: number): void;

	/**
	 * Sets a column sort key.
	 * @param columnIndex The column index.
	 * @param ascending The sort order; true for ascending, false for descending.
	 * @returns A Promise<void> that resolves when the sorting has completed.
	 */
	setColumnSortKey(columnIndex: number, ascending: boolean): Promise<void>;

	/**
	 * Removes a column sort key.
	 * @param columnIndex The column index.
	 * @returns A Promise<void> that resolves when the sorting has completed.
	 */
	removeColumnSortKey(columnIndex: number): Promise<void>;

	/**
	 * Clears the column sort keys.
	 * @returns A Promise<void> that resolves when the sorting has completed.
	 */
	clearColumnSortKeys(): Promise<void>;

	/**
	 * Sets the screen size.
	 * @param width The width.
	 * @param height The height.
	 */
	setScreenSize(width: number, height: number): void;

	/**
	 * Sets the screen position.
	 * @param firstColumnIndex The first column index.
	 * @param firstRowIndex The first row index.
	 */
	setScreenPosition(firstColumnIndex: number, firstRowIndex: number): void;

	/**
	 * Sets the first column index.
	 * @param firstColumnIndex The first column index.
	 */
	setFirstColumn(firstColumnIndex: number): void;

	/**
	 * Sets the first row index.
	 * @param firstRowIndex The first row.
	 */
	setFirstRow(firstRowIndex: number): void;

	/**
	 * Sets the cursor position.
	 * @param cursorColumnIndex The cursor column index.
	 * @param cursorRowIndex The cursor row index.
	 */
	setCursorPosition(cursorColumnIndex: number, cursorRowIndex: number): void;

	/**
	 * Sets the cursor column index.
	 * @param cursorColumnIndex The cursor column index.
	 */
	setCursorColumn(cursorColumnIndex: number): void;

	/**
	 * Sets the cursor row index.
	 * @param cursorRowIndex The cursor row index.
	 */
	setCursorRow(cursorRowIndex: number): void;

	/**
	 * Clears selection.
	 */
	clearSelection(): void;

	/**
	 * Selects all.
	 */
	selectAll(): void;

	/**
	 * Selects a column.
	 * @param columnIndex The column index.
	 */
	selectColumn(columnIndex: number): void;

	/**
	 * Mouse selects a column.
	 * @param columnIndex The column index.
	 * @param mouseSelectionType The mouse selection type.
	 */
	mouseSelectColumn(columnIndex: number, mouseSelectionType: MouseSelectionType): void;

	/**
	 * Selects a row.
	 * @param rowIndex The row index.
	 */
	selectRow(rowIndex: number): void;

	/**
	 * Mouse selects a row.
	 * @param rowIndex The row index.
	 * @param mouseSelectionType The mouse selection mode.
	 */
	mouseSelectRow(rowIndex: number, mouseSelectionType: MouseSelectionType): void;

	/**
	 * Extends selection left.
	 */
	extendSelectionLeft(): void;

	/**
	 * Extends selection right.
	 */
	extendSelectionRight(): void;

	/**
	 * Extends selection up.
	 */
	extendSelectionUp(): void;

	/**
	 * Extends selection down.
	 */
	extendSelectionDown(): void;

	/**
	 * Returns the column selection state.
	 * @param columnIndex The column index.
	 * @returns A SelectionState that represents the column selection state.
	 */
	columnSelectionState(columnIndex: SelectionState): SelectionState;

	/**
	 * Returns the row selection state.
	 * @param rowIndex The row index.
	 * @returns A SelectionState that represents the row selection state.
	 */
	rowSelectionState(rowIndex: SelectionState): SelectionState;

	/**
	 * Returns a column.
	 * @param columnIndex The column index.
	 * @returns An IDataColumn that represents the column.
	 */
	column(columnIndex: number): IDataColumn;

	/**
	 * Returns a column sort.
	 * @param columnIndex The column index.
	 * @returns A IColumnSortKey that represents the column sort key.
	 */
	columnSortKey(columnIndex: number): IColumnSortKey | undefined;

	/**
	 *
	 */
	initialize(): void;

	/**
	 * Sorts the data.
	 * @param columnSorts The array of column sort keys.
	 * @returns A Promise<void> that resolves when the data is sorted.
	 */
	sortData(columnSorts: IColumnSortKey[]): Promise<void>;

	/**
	 *
	 */
	fetchData(): void;

	/**
	 * Gets a row label.
	 * @param rowIndex The row index.
	 * @returns The row label.
	 */
	rowLabel(rowIndex: number): string | undefined;

	/**
	 * Gets a cell.
	 * @param columnIndex The column index.
	 * @param rowIndex The row index.
	 * @returns The cell.
	 */
	cell(columnIndex: number, rowIndex: number): string | undefined;

	/**
	 * The onDidUpdate event.
	 */
	readonly onDidUpdate: Event<void>;
}