

class CWidgetItemNavigatorRME extends CWidget {

	/**
	 * Item navigator instance.
	 *
	 * @type {CItemNavigatorRME|null}
	 */
	#item_navigator = null;

	/**
	 * Listeners of item navigator widget.
	 *
	 * @type {Object}
	 */
	#listeners = {};

	/**
	 * Scroll amount of contents.
	 *
	 * @type {number}
	 */
	#contents_scroll_top = 0;

	/**
	 * ID of selected item.
	 *
	 * @type {string|null}
	 */
	#selected_itemid = null;

	/**
	 * Grouping combination of selected group.
	 *
	 * @type {string|null}
	 */
	#selected_itemid_group = null;
	#selected_group_identifier = null;

	/**
	 * Key of selected item.
	 *
	 * @type {string|null}
	 */
	#selected_key_ = null;

	/**
	 * Name of selected item.
	 *
	 * @type {string|null}
	 */
	#selected_name = null;

	/**
	 * Items data from the request.
	 *
	 * @type {Map<string, {hostid: string, itemid: string, key_: string, name: string, problem_count: number[]}>}
	 */
	#items_data = new Map();

	/**
	 * CSRF token for navigation.tree.toggle action.
	 *
	 * @type {string|null}
	 */
	#csrf_token = null;

	#currentScrollTop = 0;

	#isSelectingText = false;
	#scrollTop = 0;

	constructor(...args) {
		super(...args);
		this.boundHideDropdown = this.hideDropdownInav.bind(this);
	}

	onActivate() {
		this._contents.scrollTop = this.#contents_scroll_top;
	}

	onDeactivate() {
		this.#contents_scroll_top = this._contents.scrollTop;
	}

	onDestroy() {
		this.#updateProfiles(false, [], this._widgetid);
	}

	getUpdateRequestData() {
		return {
			...super.getUpdateRequestData(),
			with_config: this.#item_navigator === null ? 1 : undefined
		};
	}

	setContents(response) {
		if (this._fields.update_on_filter_only) {
			const groupIdsObj = this.getFieldsReferredData().get('groupids');
			const hostIdsObj = this.getFieldsReferredData().get('hostids');
			if (
					((groupIdsObj && (groupIdsObj.value.length === 0 || groupIdsObj.value.includes('000000'))) && this._fields.hostids.length === 0) ||
					((hostIdsObj && (hostIdsObj.value.length === 0 || hostIdsObj.value.includes('000000'))) && this._fields.groupids.length === 0)
				) {
				this.clearContents();
				this.setCoverMessage({
					message: t('Choose a host group or host to update'),
					icon: ZBX_ICON_SEARCH_LARGE
				});

				return;
			}
		}

		if (response.items.length === 0) {
			this.clearContents();
			this.setCoverMessage({
				message: t('No data found'),
				icon: ZBX_ICON_SEARCH_LARGE
			});
			this.#selected_itemid = '000000';
			this.#broadcast();

			return;
		}

		this.#csrf_token = response[CSRF_TOKEN_NAME];

		this.#items_data.clear();
		response.items.forEach(item => this.#items_data.set(item.itemid, item));

		let start = Date.now();
		if (this.#item_navigator === null) {
			this.clearContents();

			this.#item_navigator = new CItemNavigatorRME(response.config);
			this._body.appendChild(this.#item_navigator.getContainer());

			this.#registerListeners();
			this.#activateListeners();
		}

		this.addItemNavigationStyling();
		this.setupScrollListener();

		this.#item_navigator.setValue({
			items: response.items,
			hosts: response.hosts,
			is_limit_exceeded: response.is_limit_exceeded,
			selected_itemid: this.#selected_itemid
		});

		let starta = Date.now();
		if (this._fields.group_by.length > 0) {
			this.processNodes();
			this.hideGroupNodes();
			this.initAutocomplete();
		}

		if (!this._fields.show_groupings_only) {
			if (!this.hasEverUpdated() && this.isReferred()) {
				this.#selected_itemid = this.#getDefaultSelectable();

				if (this.#selected_itemid !== null) {
					this.#selected_key_ = this.#items_data.get(this.#selected_itemid).key_;

					this.#item_navigator.selectItem(this.#selected_itemid);
				}
			}
			else if (this.#selected_itemid !== null) {
				if (!this.#items_data.has(this.#selected_itemid)) {
					for (let [itemid, item] of this.#items_data) {
						if (item.key_ === this.#selected_key_ || item.name === this.#selected_name) {
							this.#selected_itemid = itemid;

							this.#item_navigator.selectItem(this.#selected_itemid);
							break;
						}
					}
				}
			}
		}

		if (this.#selected_group_identifier !== null) {
			let node = null;

			for (const el of this._container.querySelectorAll(`.${CNavigationTreeRME.ZBX_STYLE_NODE_IS_GROUP}`)) {
				try {
					const data = JSON.parse(el.dataset.group_identifier);
					if (JSON.stringify(data.group_identifier) === JSON.stringify(this.#selected_group_identifier)) {
						node = el;
						break;
					}
				}
				catch (e) {
				}
			}

			if (node) {
				const obj = JSON.parse(node.getAttribute('data-group_identifier'));
                                this.#selected_itemid_group = obj.itemids.join(",");

				const infoDiv = node.querySelector('.navigation-tree-node-info');
				if (infoDiv) {
					this.markSelected(infoDiv);
					this.refreshTree();
				}
			}
			else {
				this.#selected_itemid_group = '000000';
				this.#broadcast(this.#selected_itemid_group);
			}
		}
		this.scrollToSelection();

		const autocompleteInput = this._container.querySelector('.autocomplete-input-itemn');
		const widgetContents = this._container.querySelector('.dashboard-grid-widget-contents');

		if (autocompleteInput !== null) {
			autocompleteInput.addEventListener('mousedown', () => {
				this.#isSelectingText = true;
				this.#scrollTop = widgetContents.scrollTop;
			});

			this.detachScrollListeners();
			this.boundMouseUp = this.handleMouseUpInav.bind(this);
			this.attachScrollListeners();

			widgetContents.addEventListener('scroll', (event) => {
				if (this.#isSelectingText) {
					widgetContents.scrollTop = this.#scrollTop;
				}
			});
		}
	}

	attachScrollListeners() {
		document.addEventListener('mouseup', this.boundMouseUp);
	}

	detachScrollListeners() {
		document.removeEventListener('mouseup', this.boundMouseUp);
	}

	handleMouseUpInav() {
		if (this.#isSelectingText) {
			this.#isSelectingText = false;
			document.body.style.userSelect = '';
		}
	}

	addTagsToBroadcastGroup() {
		const result = {
			tags: []
		};

		for (let i = 0; i < this.#selected_group_identifier.length; i++) {
			if (this._fields.group_by[i].attribute === 3) {
				result.tags.push({
					tag: this._fields.group_by[i].tag_name,
					value: this.#selected_group_identifier[i]
				});
			}
		}

		return result;
	}

	#broadcast(broadcastGroup = []) {
		if (broadcastGroup.length > 0) {
			this.broadcast({
				[CWidgetsData.DATA_TYPE_ITEM_ID]: [broadcastGroup],
				[CWidgetsData.DATA_TYPE_ITEM_IDS]: [broadcastGroup]
			});
		}
		else {
			this.broadcast({
				[CWidgetsData.DATA_TYPE_ITEM_ID]: [this.#selected_itemid],
				[CWidgetsData.DATA_TYPE_ITEM_IDS]: [this.#selected_itemid]
			});
		}
	}

	#getDefaultSelectable() {
		const selected_element = this._body.querySelector(`.${CNavigationTreeRME.ZBX_STYLE_NODE_IS_ITEM}`);

		return selected_element !== null ? selected_element.dataset.id : null;
	}

	onReferredUpdate() {
		if (this.#item_navigator === null || this.#selected_itemid !== null || this._fields.show_groupings_only) {
			return;
		}

		this.#selected_itemid = this.#getDefaultSelectable();

		if (this.#selected_itemid !== null) {
			this.#selected_key_ = this.#items_data.get(this.#selected_itemid).key_;
			this.#selected_name = this.#items_data.get(this.#selected_itemid).name;

			this.#item_navigator.selectItem(this.#selected_itemid);
		}
	}

	#registerListeners() {
		this.#listeners = {
			itemSelect: e => {
				this.#selected_itemid = e.detail.itemid;
				this.#selected_key_ = this.#items_data.get(this.#selected_itemid).key_;
				this.#selected_name = this.#items_data.get(this.#selected_itemid).name;

				this.#broadcast();
			},

			groupToggle: e => {
				if (this._widgetid) {
					this.#updateProfiles(e.detail.is_open, e.detail.group_identifier, this._widgetid);
				}
			}
		};
	}

	#activateListeners() {
		this.#item_navigator.getContainer().addEventListener(CItemNavigatorRME.EVENT_ITEM_SELECT,
			this.#listeners.itemSelect
		);
		this.#item_navigator.getContainer().addEventListener(CItemNavigatorRME.EVENT_GROUP_TOGGLE,
			this.#listeners.groupToggle
		);
	}

	/**
	 * Update expanded and collapsed group state in user profile.
	 *
	 * @param {boolean} is_open          Indicator whether the group is open or closed.
	 * @param {array}   group_identifier Group path identifier.
	 * @param {string}  widgetid         Widget ID.
	 */
	#updateProfiles(is_open, group_identifier, widgetid) {
		const curl = new Curl('zabbix.php');

		curl.setArgument('action', 'widget.navigation.tree.toggle');

		fetch(curl.getUrl(), {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({is_open, group_identifier, widgetid, [CSRF_TOKEN_NAME]: this.#csrf_token})
		})
			.then((response) => response.json())
			.then((response) => {
				if ('error' in response) {
					throw {error: response.error};
				}

				return response;
			})
			.catch((exception) => {
				let title;
				let messages = [];

				if (typeof exception === 'object' && 'error' in exception) {
					title = exception.error.title;
					messages = exception.error.messages;
				}
				else {
					title = t('Unexpected server error.');
				}

				this._updateMessages(messages, title);
			});
	}

	hasPadding() {
		return false;
	}

	onClearContents() {
		if (this.#item_navigator !== null) {
			this.#item_navigator.destroy();
			this.#item_navigator = null;
		}
	}

	setupScrollListener() {
		const itemNavigator = this._body.querySelector('.item-navigator');
		if (itemNavigator) {
			itemNavigator.addEventListener('scroll', () => {
				this.#currentScrollTop = itemNavigator.scrollTop;
			});
		}
	}

	scrollToSelection() {
		const itemNavigator = this._body.querySelector('.item-navigator');
		if (!itemNavigator) return;

		const selectedItem = itemNavigator.querySelector('.itemnav-selected');
		const parentElement = selectedItem?.closest('.navigation-tree-node-is-group');
		const container = this._container.querySelector('.dashboard-grid-widget-contents');
		const offset = 125;
		if (selectedItem && parentElement) {
			const containerRect = container.getBoundingClientRect();
			const elementRect = parentElement.getBoundingClientRect();

			const scrollToAdjustment = elementRect.top - containerRect.top - offset;
			container.scrollTop += scrollToAdjustment;
		}
		else {
			itemNavigator.scrollTop = this.#currentScrollTop;
		}
	}

	#getDescendantItemIds(groupNode) {
		const descendantItems = groupNode.querySelectorAll('.navigation-tree-node-is-item[data-id]');
		const itemIds = Array.from(descendantItems).map(node => node.getAttribute('data-id'));
		return itemIds.join(',');
	}

	hideGroupNodes() {
		const nodes = this._container.querySelectorAll('[data-group_identifier]');
		nodes.forEach(node => {
			node.classList.remove('navigation-tree-node-is-open');
			const infoDiv = node.querySelector('.navigation-tree-node-info');
			const arrowSpan = infoDiv?.querySelector('.navigation-tree-node-info-arrow span');

                        if (arrowSpan) {
				arrowSpan.className = 'arrow-right';
			}

		});
	}

	initAutocomplete() {
		const self = this;
		const $container = $(this._container);
		const $itemNavigator = $container.find('.item-navigator');
		const $widgetContents= $container.find('.dashboard-grid-widget-body');

		const $oldContainer = $container.find('.autocomplete-container-itemn');
		if ($oldContainer.length > 0) {
			$oldContainer.remove();
		}
		self.detachDropdownListeners();

		const extractGroupIdentifiers = () => {
			const groupIdentifiers = new Set();
			$('[data-group_identifier]', $itemNavigator).each(function () {
				const obj = JSON.parse($(this).attr('data-group_identifier'));
				const identifier = obj.group_identifier.join(': ');
				groupIdentifiers.add(identifier);
			});
			return Array.from(groupIdentifiers);
		};

		const groupIdentifiers = extractGroupIdentifiers();

		const $inputBox = $('<input type="text" placeholder="Search for an item grouping..." class="autocomplete-input-itemn">');
		const $dropdownArrow = $('<div class="zi-chevron-down modified-chevron"></div>');
		const $dropdown = $('<div class="autocomplete-dropdown-itemn"></div>');
		const $autocompleteContainer = $('<div class="autocomplete-container-itemn"></div>').append($inputBox).append($dropdownArrow).append($dropdown);

		const findGroupNode = (group) => {
			const parts = group.split(': ');

			return $itemNavigator.find('[data-group_identifier]').filter(function () {
				const obj = JSON.parse(this.getAttribute('data-group_identifier'));
				return JSON.stringify(obj.group_identifier) === JSON.stringify(parts);
			}).first();
		};

		$widgetContents.before($autocompleteContainer);

		$inputBox.on('input', function() {
			const val = $(this).val().toLowerCase();
			$dropdown.empty();
			if (val) {
				const searchRegex = new RegExp(val.replace(/\*/g, '.*'));
				groupIdentifiers.forEach(group => {
					if (searchRegex.test(group.toLowerCase())) {
						const $item = $('<div class="autocomplete-item-itemn"></div>').text(group);
						$item.on('click', function() {
							$inputBox.val(group);
							$dropdown.hide();
							const $groupNode = findGroupNode(group);
							processSelectedNode($groupNode);
						});
						$dropdown.append($item);
					}
				});
			}
			if ($dropdown.children().length > 0) {
				$dropdown.show();
			}
			else {
				$dropdown.hide();
			}
		});

		$dropdownArrow.on('click', function() {
			if ($dropdown.is(':visible')) {
				$dropdown.hide();
			}
			else {
				$dropdown.empty();
				groupIdentifiers.forEach(group => {
					const $item = $('<div class="autocomplete-item-itemn"></div>').text(group);
					$item.on('click', function() {
						$inputBox.val(group);
						$dropdown.hide();
						const $groupNode = findGroupNode(group)
						processSelectedNode($groupNode);
					});
					$dropdown.append($item);
				});
				$dropdown.show();
			}
		});

		function processSelectedNode(groupNode) {
			if (groupNode.length > 0) {
				const obj = JSON.parse(groupNode.attr('data-group_identifier'));
				const identifier = obj.group_identifier;
				self.#selected_group_identifier = identifier;

				const descendantIds = obj.itemids.join(",");
				self.#selected_itemid_group = descendantIds;

				if (self.#selected_itemid_group === undefined) {
					self.#selected_itemid_group = '000000';
				}
				self.hideGroupNodes();
				const $infoDiv = groupNode.find('.navigation-tree-node-info').first()[0];

				if (self.#selected_itemid_group !== '000000') {
					self.markSelected($infoDiv);
				}

				self.refreshTree();
				self.scrollToSelection();
			}
		}

		self.attachDropdownListeners();
	}

	hideDropdownInav(e) {
		if (!$(e.target).closest('.autocomplete-container-itemn').length) {
			$('.autocomplete-dropdown-itemn').hide();
		}
	}

	attachDropdownListeners() {
		$(document).on('click', this.boundHideDropdown);
	}

	detachDropdownListeners() {
		$(document).off('click', this.boundHideDropdown);
	}

	processNodes(response) {
		if (this._delegatedClickHandler) {
			this._container.removeEventListener('click', this._delegatedClickHandler);
		}

		this._delegatedClickHandler = (event) => {
			const infoDiv = event.target.closest('.navigation-tree-node-info');
			if (
				!infoDiv ||
				event.target.closest('button') ||
				infoDiv.parentElement.classList.contains('navigation-tree-node-is-item')
			) {
				return;
			}

			event.stopPropagation();
			this.hideGroupNodes();

			const groupNode = infoDiv.closest('.navigation-tree-node-is-group');
			const obj = JSON.parse(groupNode.getAttribute('data-group_identifier'));
			this.#selected_group_identifier = obj.group_identifier;

			this.#selected_itemid_group = obj.itemids.join(",");;
			this.markSelected(infoDiv);
			this.refreshTree();
		};

		this._container.addEventListener('click', this._delegatedClickHandler);

	}

	markSelected(node) {
		let selected_itemid_group;
		if (node.classList.contains('itemnav-selected')) {
			node.classList.remove('itemnav-selected');
			this.#selected_itemid_group = [];
			this.#selected_group_identifier = null;
			selected_itemid_group = '000000';
		}
		else {
			this._container.querySelectorAll('.itemnav-selected').forEach(el => el.classList.remove('itemnav-selected'));
			node.classList.add('itemnav-selected');
			const itemidArray = this.#selected_itemid_group.split(',');
			const tags = this.addTagsToBroadcastGroup();
			const jsonArray = itemidArray.map((itemid, index) => {
				const obj = { itemid, color: '' };
				if (index === 0) {
					obj.tags = tags.tags;
				}
				return obj;
			});
			selected_itemid_group = JSON.stringify(jsonArray);
		}
		this.#broadcast(selected_itemid_group);
	}

	refreshTree() {
		this._container.querySelectorAll('.navigation-tree-node').forEach(node => {
			const infoDiv = node.querySelector('.navigation-tree-node-info');
			const arrowSpan = infoDiv?.querySelector('.navigation-tree-node-info-arrow span');

			if (arrowSpan) {
				if (node.classList.contains('navigation-tree-node-is-open')) {
					arrowSpan.classList.add('arrow-down');
					arrowSpan.classList.remove('arrow-right');
				}
				else {
					arrowSpan.classList.add('arrow-right');
					arrowSpan.classList.remove('arrow-down');
				}
			}

			if (node.classList.contains('itemnav-selected') || node.querySelector('.itemnav-selected')) {
				let current = node;

				while (true) {
					const childrenContainer = current.parentElement;
					if (!childrenContainer || !childrenContainer.classList.contains('navigation-tree-node-children')) break;

					const parentNode = childrenContainer.parentElement;
					if (!parentNode || !parentNode.classList.contains('navigation-tree-node')) break;

					if (!parentNode.classList.contains('navigation-tree-node-is-open')) {
						parentNode.classList.add('navigation-tree-node-is-open');
						const parentInfoDiv = parentNode.querySelector('.navigation-tree-node-info');
						const parentArrowSpan = parentInfoDiv?.querySelector('.navigation-tree-node-info-arrow span');
						if (parentArrowSpan) {
							parentArrowSpan.classList.add('arrow-down');
							parentArrowSpan.classList.remove('arrow-right');
						}
					}

					current = parentNode;
				}
			}
		});

		const selectedNode = this._container.querySelector('.itemnav-selected');
		if (selectedNode) {
			const selectedGroupNode = selectedNode.closest('.navigation-tree-node.navigation-tree-node-is-group');
			if (selectedGroupNode && !selectedGroupNode.classList.contains('navigation-tree-node-is-open')) {
				selectedGroupNode.classList.add('navigation-tree-node-is-open');
				const infoDiv = selectedGroupNode.querySelector('.navigation-tree-node-info');
				const arrowSpan = infoDiv?.querySelector('.navigation-tree-node-info-arrow span');
				if (arrowSpan) {
					arrowSpan.classList.add('arrow-down');
					arrowSpan.classList.remove('arrow-right');
				}
			}
		}
	}

	addItemNavigationStyling() {
		if ($('style.autocomplete-item-input-styles').length ===0) {
			const styleElement = document.createElement('style');
			styleElement.classList.add('autocomplete-item-input-style');
			styleElement.textContent = `
				:root {
					--autocomplete-bg-dark: #2b2b2b;
					--autocomplete-color-dark: #ffffff;
					--autocomplete-bg-light: #ffffff;
					--autocomplete-color-light: #000000;
					--autocomplete-hover-dark: #383838;
					--autocomplete-hover-light: #ccecfe;
				}
				.nav-hoverable-itemn {
					cursor: pointer;
				}
				.nav-hoverable-itemn:hover {
					background-color: rgba(241, 156, 71, 0.12);
					border-radius: 6px;
					transition: background-color 0.2s ease;
				}
				.itemnav-selected {
					background: linear-gradient(to right, #f6b73c, #fecd57);
					color: #000;
					border-radius: 6px;
					padding: 4px 8px;
					box-shadow: 0 0 8px rgba(52, 152, 219, 0.12);
				}
				.autocomplete-container-itemn {
					position: sticky;
					display: inline-block;
					width: 100%;
					box-sizing: border-box;
					z-index: 10;
					top: 0;
					padding: 6px 0;
					background: var(--autocomplete-bg);
				}
				.autocomplete-input-itemn {
					width: calc(100% - 40px);
					font-size: 12px;
					padding-right: 10px;
					box-sizing: border-box;
				}
				.modified-chevron {
					position: absolute;
					right: 20px;
					top: 50%;
					transform: translateY(-50%);
					cursor: pointer;
				}
				.autocomplete-dropdown-itemn {
					border: 1px solid #ccc;
					border-radius: 4px;
					position: absolute;
					top: 100%;
					left: 0;
					z-index: 1000;
					background-color: var(--autocomplete-bg);
					color: var(--autocomplete-color);
					max-height: 300px;
					overflow-y: auto;
					font-size: 12px;
					width: calc(100% - 40px);
					display: none;
				}
				.autocomplete-item-itemn {
					padding: 8px;
					cursor: pointer;
				}
				.autocomplete-item-itemn:hover {
					background-color: var(--autocomplete-hover);
				}
			`;
			document.head.appendChild(styleElement);

			var theme = jQuery('html').attr('theme');
			const root = document.documentElement;
			switch (theme) {
				case 'dark-theme':
				case 'hc-dark':
					root.style.setProperty('--autocomplete-bg', 'var(--autocomplete-bg-dark)');
					root.style.setProperty('--autocomplete-color', 'var(--autocomplete-color-dark)');
					root.style.setProperty('--autocomplete-hover', 'var(--autocomplete-hover-dark)');
					break;
				case 'blue-theme':
				case 'hc-light':
					root.style.setProperty('--autocomplete-bg', 'var(--autocomplete-bg-light)');
					root.style.setProperty('--autocomplete-color', 'var(--autocomplete-color-light)');
					root.style.setProperty('--autocomplete-hover', 'var(--autocomplete-hover-light)');
					break;
				default:
					break;
			}
		}
	}

}
