

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

	#searchBoxValue = '';
	#inputHadFocus = false

	constructor(...args) {
		super(...args);
		this._closeDropdown = () => {};
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

		if (this.#item_navigator === null) {
			this.clearContents();

			this.#item_navigator = new CItemNavigatorRME(response.config);
			this._body.appendChild(this.#item_navigator.getContainer());

			this.#registerListeners();
			this.#activateListeners();
		}

		this.setupScrollListener();

		this.#item_navigator.setValue({
			items: response.items,
			hosts: response.hosts,
			is_limit_exceeded: response.is_limit_exceeded,
			selected_itemid: this.#selected_itemid
		});

		if (this._fields.group_by.length > 0) {
			this.processNodes();
			this.hideGroupNodes();
			this.initAutocomplete();
		}

		if (!this._fields.show_groupings_only) {
			if (this.isReferred() && (this.isFieldsReferredDataUpdated() || !this.hasEverUpdated())) {
				if (this.#selected_itemid === null || (!this.#hasSelectable() && !this.#selectItemidByKey())) {
					this.#selected_itemid = this.#getDefaultSelectable();
				}

				if (this.#selected_itemid !== null) {
					this.#selected_key_ = this.#items_data.get(this.#selected_itemid).key_;

					this.#item_navigator.selectItem(this.#selected_itemid);
				}
			}
			else if (this.#selected_itemid !== null) {
				if (!this.#items_data.has(this.#selected_itemid) && this.#selectItemidByKey()) {
					this.#item_navigator.selectItem(this.#selected_itemid);
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

		// Restore focus to search input if it had focus before refresh
		if (this.#inputHadFocus && this.autocompleteInput) {
			requestAnimationFrame(() => {
				this.autocompleteInput.focus();
				const length = this.autocompleteInput.value.length;
				this.autocompleteInput.setSelectionRange(length, length);
			});
		}
	}

	#selectItemidByKey() {
		for (let [itemid, item] of this.#items_data) {
			if (item.key_ === this.#selected_key_) {
				this.#selected_itemid = itemid;

				return true;
			}
		}

		return false;
	}

	#hasSelectable() {
		return this.#items_data.has(this.#selected_itemid);
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

	onResize() {
		if (this._closeDropdown) {
			this._closeDropdown();
		}
	}

	onClearContents() {
		if (this.#item_navigator !== null) {
			this.#item_navigator.destroy();
			this.#item_navigator = null;
		}

		// Clean up autocomplete dropdown
		if (this._autocompleteRepositionHandler) {
			window.removeEventListener('scroll', this._autocompleteRepositionHandler, true);
			window.removeEventListener('resize', this._autocompleteRepositionHandler, true);
			this._autocompleteRepositionHandler = null;
		}

		if (this._autocompleteOutsideClickHandler) {
			document.removeEventListener('click', this._autocompleteOutsideClickHandler);
			this._autocompleteOutsideClickHandler = null;
		}

		if (this._autocompleteRafId) {
			cancelAnimationFrame(this._autocompleteRafId);
			this._autocompleteRafId = null;
		}

		if (this._autocompleteDragObserver) {
			this._autocompleteDragObserver.disconnect();
			this._autocompleteDragObserver = null;
		}
		if (this.autocompleteDropdown && this.autocompleteDropdown.parentNode) {
			this.autocompleteDropdown.remove();
			this.autocompleteDropdown = null;
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
		const offset = 80;
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
		const $container = $(self._container);
		const $itemNavigator = $container.find('.item-navigator');
		const $widgetContents = $container.find('.dashboard-grid-widget-body');

		const $oldContainer = $container.find('.autocomplete-container-itemn');
		if ($oldContainer.length > 0) {
			$oldContainer.remove();
		}

		// Clean up existing dropdown if it exists
		if (self.autocompleteDropdown && self.autocompleteDropdown.parentNode) {
			self.autocompleteDropdown.remove();
		}

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

		const $inputBox = $(`<input type="text" placeholder="Search for an item grouping..." value="${self.#searchBoxValue}" class="autocomplete-input-itemn">`);
		$inputBox.attr({
			'autocomplete': 'off',
			'role': 'combobox',
			'aria-autocomplete': 'list',
			'aria-expanded': 'false',
			'aria-controls': 'autocomplete-dropdown-itemn-' + self._widgetid
		});

		const $dropdownArrow = $('<div class="zi-chevron-down modified-chevron"></div>');
		$dropdownArrow.attr({
			'role': 'button',
			'tabindex': '0',
			'aria-label': 'Toggle dropdown'
		});

		const $dropdown = $('<div class="autocomplete-dropdown-itemn"></div>');
		$dropdown.attr({
			'data-autocomplete-dropdown': 'true',
			'role': 'listbox',
			'id': 'autocomplete-dropdown-itemn-' + self._widgetid,
			'tabindex': '-1'
		});

		const $autocompleteContainer = $('<div class="autocomplete-container-itemn"></div>').append($inputBox).append($dropdownArrow);
		$autocompleteContainer.attr('data-autocomplete-widget-' + self._widgetid, 'true');
		$widgetContents.before($autocompleteContainer);

		let currentIndex = -1;

		const findGroupNode = (group) => {
			const parts = group.split(': ');
			return $itemNavigator.find('[data-group_identifier]').filter(function () {
				const obj = JSON.parse(this.getAttribute('data-group_identifier'));
				return JSON.stringify(obj.group_identifier) === JSON.stringify(parts);
			}).first();
		};

		// Position dropdown dynamically with RAF
		const positionDropdown = () => {
			if (!document.body.contains($autocompleteContainer[0])) {
				return;
			}

			const containerOffset = $autocompleteContainer.offset();
			const containerWidth = $autocompleteContainer.outerWidth();

			$dropdown.css({
				'position': 'fixed',
				'top': containerOffset.top + $autocompleteContainer.outerHeight() + 'px',
				'left': containerOffset.left + 'px',
				'width': (containerWidth - 40) + 'px'
			});
		};

		// Helper function to get first visible item
		const getFirstVisibleItem = () => {
			const allItems = $dropdown.find('.autocomplete-item-itemn');
			return allItems.length > 0 ? allItems[0] : null;
		};

		// Focus item function
		const focusItem = (index) => {
			const allItems = $dropdown.find('.autocomplete-item-itemn');
			if (allItems.length === 0) return;

			allItems.removeClass('focused');

			if (index >= 0 && index < allItems.length) {
				const itemToFocus = $(allItems[index]);
				currentIndex = index;
				itemToFocus.addClass('focused');
				itemToFocus[0].scrollIntoView({ block: 'nearest' });
			}
		};

		// Close dropdown function (defined early so it can be used by observers)
		const closeDropdown = () => {
			$dropdown.hide();
			$inputBox.attr('aria-expanded', 'false');
			$dropdownArrow.removeClass('open');
			currentIndex = -1;
			$dropdown.find('.autocomplete-item-itemn').removeClass('focused');
			cleanupRepositionHandlers();
			cleanupOutsideClickHandler();

			setTimeout(() => {
				self._resumeUpdating();
			}, 10);
		};

		self._closeDropdown = closeDropdown;

		// RAF-based repositioning
		const rafPlace = () => {
			if (self._autocompleteRafId) {
				cancelAnimationFrame(self._autocompleteRafId);
			}
			self._autocompleteRafId = requestAnimationFrame(() => {
				// Check if widget is being dragged
				if (self._isDragging()) {
					closeDropdown();
					return;
				}
				positionDropdown();
				self._autocompleteRafId = null;
			});
		};

		// Setup reposition handlers
		const setupRepositionHandlers = () => {
			if (self._autocompleteRepositionHandler) {
				window.removeEventListener('scroll', self._autocompleteRepositionHandler, true);
				window.removeEventListener('resize', self._autocompleteRepositionHandler, true);
				self._autocompleteRepositionHandler = null;
			}

			self._autocompleteRepositionHandler = () => {
				rafPlace();
			};

			window.addEventListener('scroll', self._autocompleteRepositionHandler, true);
			window.addEventListener('resize', self._autocompleteRepositionHandler, true);
		};

		// Cleanup reposition handlers
		const cleanupRepositionHandlers = () => {
			if (self._autocompleteRepositionHandler) {
				window.removeEventListener('scroll', self._autocompleteRepositionHandler, true);
				window.removeEventListener('resize', self._autocompleteRepositionHandler, true);
				self._autocompleteRepositionHandler = null;
			}

			if (self._autocompleteRafId) {
				cancelAnimationFrame(self._autocompleteRafId);
				self._autocompleteRafId = null;
			}
		};

		// Setup outside click handler
		const setupOutsideClickHandler = () => {
			if (self._autocompleteOutsideClickHandler) {
				document.removeEventListener('click', self._autocompleteOutsideClickHandler);
				self._autocompleteOutsideClickHandler = null;
			}

			self._autocompleteOutsideClickHandler = (e) => {
				let element = e.target;
				let isOurDropdown = false;

				while (element && element !== document) {
					if (element.hasAttribute && (element.hasAttribute('data-autocomplete-widget-' + self._widgetid) ||
							element.hasAttribute('data-autocomplete-dropdown'))) {
						isOurDropdown = true;
						break;
					}
					element = element.parentElement;
				}

				if (!isOurDropdown) {
					closeDropdown();
				}
			};

			setTimeout(() => {
				document.addEventListener('click', self._autocompleteOutsideClickHandler);
			}, 10);
		};

		// Cleanup outside click handler
		const cleanupOutsideClickHandler = () => {
			if (self._autocompleteOutsideClickHandler) {
				document.removeEventListener('click', self._autocompleteOutsideClickHandler);
				self._autocompleteOutsideClickHandler = null;
			}
		};

		// Watch for dragging via MutationObserver
		const dragObserver = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
					if (self._isDragging() && $dropdown.is(':visible')) {
						closeDropdown();
					}
				}
			});
		});

		dragObserver.observe(self._target, {
			attributes: true,
			attributeFilter: ['class']
		});

		self._autocompleteDragObserver = dragObserver;

		// Open dropdown
		const openDropdown = (skipFocus = false) => {
			self._pauseUpdating();

			if (!document.body.contains($dropdown[0])) {
				document.body.appendChild($dropdown[0]);
			}

			setupRepositionHandlers();

			requestAnimationFrame(() => {
				positionDropdown();
				$dropdown.show();
				$inputBox.attr('aria-expanded', 'true');
				$dropdownArrow.addClass('open');
				setupOutsideClickHandler();

				if (!skipFocus) {
					const firstVisible = getFirstVisibleItem();
					if (firstVisible) {
						const idx = $(firstVisible).data('index');
						focusItem(idx);
					}
					$dropdown.focus();
				}
			});
		};

		function processSelectedNode(groupNode, fromAutocomplete = false) {
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

				// Return focus to search box when selecting from autocomplete
				if (fromAutocomplete && self.autocompleteInput) {
					requestAnimationFrame(() => {
						self.autocompleteInput.focus();
						const length = self.autocompleteInput.value.length;
						self.autocompleteInput.setSelectionRange(length, length);
					});
				}
			}
		}

		// Populate dropdown with items
		const populateDropdown = (filterTerm = '') => {
			$dropdown.empty();
			const searchRegex = filterTerm ? new RegExp(filterTerm.replace(/\*/g, '.*')) : null;

			let displayIndex = 0;
			groupIdentifiers.forEach((group, originalIndex) => {
				if (!searchRegex || searchRegex.test(group.toLowerCase())) {
					const $item = $('<div class="autocomplete-item-itemn"></div>').text(group);
					$item.attr({
						'role': 'option',
						'data-index': displayIndex,
						'data-text': group.toLowerCase()
					});

					$item.on('click', function(e) {
						e.stopPropagation();
						self.#searchBoxValue = group;
						$inputBox.val(group);
						closeDropdown();
						const $groupNode = findGroupNode(group);
						processSelectedNode($groupNode, true);
					});

					$item.on('mouseenter', function() {
						focusItem(displayIndex);
					});

					$dropdown.append($item);
					displayIndex++;
				}
			});
		};

		// Search input focus tracking
		$inputBox.on('focus', function() {
			self.#inputHadFocus = true;
		});

		$inputBox.on('blur', function() {
			self.#inputHadFocus = false;
		});

		// Search input handlers
		$inputBox.on('input', function() {
			const val = $(this).val();
			self.#searchBoxValue = val;
			const valLower = val.toLowerCase();

			if (val === '') {
				closeDropdown();
				return;
			}

			populateDropdown(valLower);

			if ($dropdown.children().length > 0) {
				if (valLower.length > 0) {
					openDropdown(true);
				}
				else {
					openDropdown();
				}
			}
			else {
				closeDropdown();
			}
		});

		// Search input keyboard navigation
		$inputBox.on('keydown', function(e) {
			const allItems = $dropdown.find('.autocomplete-item-itemn');

			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault();
					if ($dropdown.is(':visible')) {
						if (currentIndex < 0 && allItems.length > 0) {
							focusItem(0);
						}
						$dropdown.focus();
					}
					else {
						openDropdown();
					}
					break;
				case 'ArrowUp':
					e.preventDefault();
					if ($dropdown.is(':visible')) {
						if (allItems.length > 0) {
							focusItem(allItems.length - 1);
						}
						$dropdown.focus();
					}
					else {
						openDropdown();
					}
					break;
				case 'Escape':
					e.preventDefault();
					closeDropdown();
					$inputBox.val('');
					self.#searchBoxValue = '';
					populateDropdown();
					break;
				case 'Enter':
					e.preventDefault();
					const firstVisible = getFirstVisibleItem();
					if (firstVisible) {
						$(firstVisible).click();
					}
					break;
			}
		});

		// Dropdown arrow click handler
		$dropdownArrow.on('click', function(e) {
			e.stopPropagation();
			e.preventDefault();

			if ($dropdown.is(':visible')) {
				closeDropdown();
			}
			else {
				populateDropdown();
				openDropdown();
			}
		});

		// Dropdown arrow keyboard handler
		$dropdownArrow.on('keydown', function(e) {
			switch (e.key) {
				case ' ':
				case 'Enter':
					e.preventDefault();
					if ($dropdown.is(':visible')) {
						closeDropdown();
					}
					else {
						populateDropdown();
						openDropdown();
					}
					break;
				case 'ArrowDown':
					e.preventDefault();
					populateDropdown();
					openDropdown();
					break;
				case 'ArrowUp':
					e.preventDefault();
					populateDropdown();
					openDropdown();
					const allItems = $dropdown.find('.autocomplete-item-itemn');
					if (allItems.length > 0) {
						focusItem(allItems.length - 1);
					}
					break;
				case 'Escape':
					e.preventDefault();
					closeDropdown();
					break;
			}
		});

		// Dropdown list keyboard navigation
		$dropdown.on('keydown', function(e) {
			const allItems = $dropdown.find('.autocomplete-item-itemn');

			if (allItems.length === 0) return;

			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault();
					let nextIndex = currentIndex + 1;
					if (nextIndex >= allItems.length) {
						nextIndex = 0;
					}
					focusItem(nextIndex);
					break;
				case 'ArrowUp':
					e.preventDefault();
					let prevIndex = currentIndex - 1;
					if (prevIndex < 0) {
						prevIndex = allItems.length - 1;
					}
					focusItem(prevIndex);
					break;
				case 'Enter':
					e.preventDefault();
					if (currentIndex >= 0 && currentIndex < allItems.length) {
						$(allItems[currentIndex]).click();
					}
					break;
				case 'Escape':
					e.preventDefault();
					closeDropdown();
					$inputBox.focus();
					break;
				case 'Tab':
					closeDropdown();
					break;
			}
		});

		// Store references for cleanup
		self.autocompleteDropdown = $dropdown[0];
		self.autocompleteInput = $inputBox[0];
		self.autocompleteContainer = $autocompleteContainer[0];
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

			// Check if the click is specifically on the span inside primary
			const primarySpan = event.target.closest('.navigation-tree-node-info-primary span');
			if (!primarySpan) {
				return;
			}

			event.stopPropagation();
			this.hideGroupNodes();

			const groupNode = infoDiv.closest('.navigation-tree-node-is-group');
			const obj = JSON.parse(groupNode.getAttribute('data-group_identifier'));
			this.#selected_group_identifier = obj.group_identifier;

			this.#selected_itemid_group = obj.itemids.join(",");
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

}
