# zabbix-widgets-itemnavigator
An enhanced Itemnavigator Widget for the Zabbix Dashboard


# Itemnavigator Widget User Guide

This widget extends the standard itemnavigator functionality with a set of interactive features designed to make item navigation and selection more powerful to supported widgets in the [gryan337 git repository](https://github.com/gryan337).  

---


- 📡 **Multi-metric broadcasting**  
  Broadcasts multiple `itemid`s to listening widgets. Only supported [gryan337](https://github.com/gryan337) widgets can properly process these broadcasts.  
  > Until Zabbix natively supports multi-select or metric broadcasting, this widget provides a practical workaround.

- 🌳 **Navigation tree groupings are clickable**  
  Enables clicking **Group by** nodes in the navigation tree to broadcast all descendant metrics (`itemid`s).  
  > This widget *strongly* relies on intelligent tagging design for your items. Proper tagging unlocks powerful displays in listening widgets such as [zabbix-widgets-piechart](https://github.com/gryan337/zabbix-widgets-piechart) and [zabbix-widgets-svggraph](https://github.com/gryan337/zabbix-widgets-svggraph).

- 🔍 **Search functionality**  
  Adds a search box at the top of the widget panel for quickly filtering item groupings and metrics.  
  - Search box is added only after adding one `Group by` in the widget configuration.  
  - As you type, matching results are displayed in real time.  
  - Clicking a result automatically selects and broadcasts to listening widgets.  
  - A dropdown option allows browsing the full list of item groupings.  

- 🗂️ **Groupings-only view**  
  Optionally display only **item groupings** without listing individual items. This is especially useful in large environments or for specialized use cases.  
  - This is activated by the `Show groupings only` checkbox in the widget configuration.  
  **Example:** If you monitor CPU utilization of individual process threads and want to quickly plot all threads in a graph, you can:  
  1. Tag metrics consistently.  
  2. Group them using `Item tag value` in the widget configuration.  
  3. With one click, broadcast and visualize all thread metrics at once.  
  > With proper item tagging, the possibilities are nearly unlimited.

- 🚦 **Default empty state**  
  By default, the widget displays nothing unless **Host groups**, **Hosts**, or **Host tags** are specified.  
  > Prevents overwhelming output in large installations until a filter is applied (e.g., via the Host Navigator widget or Table widget).

- 📈 **Increased item limits**  
  Substantially increases the maximum item limit, enabling scalability for large Zabbix installations and for scenarios where **Group by** is combined with **Show groupings only**.


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




## Functionality and Features
- This widget primarily adds the ability to broadcast multiple itemids to listening widgets. However, only supported gryan337 widgets will be able to properly accept and process these broadcasts. Until the Zabbix company adds a built-in way to broadcast multiple metrics with a single click, or allows multi-select this widget's capabilities will serve as a way to perform this functionality.
- When setting 'Group by' options you can now click the 'Group by' in the navigation tree. This will result in broadcasting all descendant metrics in the tree. With this change it is highly important to make use of tags with all of your metrics to enable powerful displays in listening widgets like the gryan337 pie chart and svggraph.
- Adds a search box at the top of the widget to permit searching the item groupings and metrics.
- Adds the ability to only show item groupings and not the individual items.
- By default, the widget will show nothing if there are no Host groups, Hosts or Host tags specified. In large installations this is important so that everything is not displayed until a filter is applied (i.e. from the Host navigator widget or the Table widget).
- Increases the Item limit substantially. This is also necessary for large Zabbix installations and when using the 'Group by' options with 'Show groupings only'

## Disruptively Innovative Modifications
- This widget has been modified to broadcast multiple itemids to other widgets in the gryan337 git repository. As of right now, the zabbix-widgets-svggraph and zabbix-widgets-piechart can accept multiple itemids from this widget. There are significant improvements coming to the zabbix-widgets-table that will provide an even more heightened user experience to help drive drill down behavior in dashboards. More documentation coming soon!

