# BASED

Add a context menu when you right click on a cell in the data grid using the
context menu component that allows you to copy the cell value. Use `onCellContextMenu`
referenced in `docs/react-data-grid/README.md` to accomplish this.

Stop the header cells in the data grid from being selected.

Add a ... menu button to the button toolbar that is a dropdown
menu with an option to copy the selected rows as a SQL insert statement. Add a
separate component for this as the table page is getting too large.

Add paging to the data grid by using the pagination component and adding it to
the button toolbar on the right side.

Use the `renderCheckbox` property on the data grid to use our custom checkbox
component instead of the one that comes with react-data-grid.
