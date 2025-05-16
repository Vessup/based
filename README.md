# BASED

Refactor the homepage to show (and allow you to edit) the database connection
information.

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

Hook up the add schema sidebar action button to logic that allows you to add a
new schema.

Hook up the add table sidebar action button to logic that adds a create table
query to a new SQL editor tab.
