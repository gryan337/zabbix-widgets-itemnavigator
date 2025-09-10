# zabbix-widgets-itemnavigator
An enhanced Itemnavigator Widget for the Zabbix Dashboard

## Functionality and Features
- This widget primarily adds the ability to broadcast multiple itemids to listening widgets. However, only supported gryan337 widgets will be able to properly accept and process these broadcasts. Until the Zabbix company adds a built-in way to broadcast multiple metrics with a single click, or allows multi-select this widget's capabilities will serve as a way to perform this functionality.
- When setting 'Group by' options you can now click the 'Group by' in the navigation tree. This will result in broadcasting all descendant metrics in the tree. With this change it is highly important to make use of tags with all of your metrics to enable powerful displays in listening widgets like the gryan337 pie chart and svggraph.
- Adds a search box at the top of the widget to permit searching the item groupings and metrics.
- Adds the ability to only show item groupings and not the individual items.
- By default, the widget will show nothing if there are no Host groups, Hosts or Host tags specified. In large installations this is important so that everything is not displayed until a filter is applied (i.e. from the Host navigator widget or the Table widget).
- Increases the Item limit substantially. This is also necessary for large Zabbix installations and when using the 'Group by' options with 'Show groupings only'

## Coming Soon...
- This widget will be able to broadcast itemids and tags to the gryan337 Table widget to allow for more customizable visualizations
