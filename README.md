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

Add a license to the project that allows people to use the software for
non-commercial use.

Add a docker file that runs the app in a container. Add the containerized app
as a new service in the docker-compose file on port 3001.

Refactor the homepage to show (and allow you to edit) the database connection
information.

Add a search input below the tables sidebar group header that allows you to
filter the list of tables.

Add a new page that allows you to write and run SQL queries and see the results
below the query editor. The query editor should use a rich text editor so that
the syntax can be highlighted appropriately. The results should use the same data
grid setup as we are using on the tables page. The query should be executed
within a transaction so that it can be killed when the user clicks a button on
the page.

Add a new sidebar group above the tables group and below the schema group that
allows you to access the SQL editor and create new editor tabs that get
persisted to local storage.

Modify the query info at the bottom of the table page to include how long the
query took.

Change the data grid background to match the sidebar color.

Don't show an outline if the cell is a header or checkbox cell, but make sure
it is still shown on all other cells.

Hook up the add schema sidebar action button to logic that allows you to add a
new schema.

Hook up the add table sidebar action button to logic that adds a create table
query to a new SQL editor tab.
