# zabbix-widgets-itemnavigator
An enhanced Itemnavigator Widget for the Zabbix Dashboard

## Functionality and Features
- This widget primarily adds the ability to broadcast multiple itemids to listening widgets. However, only supported gryan337 widgets will be able to properly accept and process these broadcasts. Until the Zabbix company adds a built-in way to broadcast multiple metrics with a single click, or allows multi-select this widget's capabilities will serve as a way to perform this functionality.
- When setting 'Group by' options you can now click the 'Group by' in the navigation tree. This will result in broadcasting all descendant metrics in the tree. With this change it is highly important to make use of tags with all of your metrics to enable powerful displays in listening widgets like the gryan337 pie chart and svggraph.
- Adds a search box at the top of the widget to permit searching the item groupings and metrics.
- Adds the ability to only show item groupings and not the individual items.
- By default, the widget will show nothing if there are no Host groups, Hosts or Host tags specified. In large installations this is important so that everything is not displayed until a filter is applied (i.e. from the Host navigator widget or the Table widget).
- Increases the Item limit substantially. This is also necessary for large Zabbix installations and when using the 'Group by' options with 'Show groupings only'

## Disruptively Innovative Modifications
- This widget has been modified to broadcast multiple itemids to other widgets in the gryan337 git repository. As of right now, the zabbix-widgets-svggraph and zabbix-widgets-piechart can accept multiple itemids from this widget. There are significant improvements coming to the zabbix-widgets-table that will provide an even more heightened user experience to help drive drill down behavior in dashboards. More documentation coming soon!


# 🚀 Project Roadmap

A high-level view of our project milestones and upcoming goals.

---

## 📍 September 2025

- [ ] Basic documentation written along with screen shots of the enhancements  
- [ ] Final QA & bug fixes (please submit bugs!)  

---

## 🛠️ Upcoming (Q4 2025)

| Milestone | Status | Target |
|-----------|--------|--------|
| Crowd sourced feature requests | Upcoming | Q4 2025 |
