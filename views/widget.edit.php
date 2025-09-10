<?php declare(strict_types = 0);


/**
 * Item navigator widget form view.
 *
 * @var CView $this
 * @var array $data
 */

use Modules\RMEItemNavigator\Includes\CWidgetFieldItemGroupingView;

$form = new CWidgetFormView($data);

$groupids_field = array_key_exists('groupids', $data['fields'])
	? new CWidgetFieldMultiSelectGroupView($data['fields']['groupids'])
	: null;

$hostids_field = $data['templateid'] === null
	? (new CWidgetFieldMultiSelectHostView($data['fields']['hostids']))
		->setFilterPreselect([
			'id' => $groupids_field->getId(),
			'accept' => CMultiSelect::FILTER_PRESELECT_ACCEPT_ID,
			'submit_as' => 'groupid'
		])
	: null;

$form
	->addField($groupids_field)
	->addField($hostids_field)
	->addField(array_key_exists('host_tags_evaltype', $data['fields'])
		? new CWidgetFieldRadioButtonListView($data['fields']['host_tags_evaltype'])
		: null
	)
	->addField(array_key_exists('host_tags', $data['fields'])
		? new CWidgetFieldTagsView($data['fields']['host_tags'])
		: null
	)
	->addField(
		(new CWidgetFieldPatternSelectItemView($data['fields']['items']))
			->setFilterPreselect($hostids_field !== null
				? [
					'id' => $hostids_field->getId(),
					'accept' => CMultiSelect::FILTER_PRESELECT_ACCEPT_ID,
					'submit_as' => 'hostid'
				]
				: []
			)
	)
	->addField(
		new CWidgetFieldRadioButtonListView($data['fields']['item_tags_evaltype'])
	)
	->addField(
		new CWidgetFieldTagsView($data['fields']['item_tags'])
	)
	->addField(
		new CWidgetFieldRadioButtonListView($data['fields']['state'])
	)
	->addField(
		new CWidgetFieldRadioButtonListView($data['fields']['problems'])
	)
	->addField(
		(new CWidgetFieldCheckBoxView($data['fields']['update_on_filter_only']))
			->setFieldHint(
				makeHelpIcon([
					_('Checking this will mean that no values will be displayed until this '), BR(),
					_('widget is filtered/updated by another widget. This requires that another '), BR(),
					_('dashboard widget be set in the Host groups or Hosts field.')
				])
			)
	)
	->addField(
		(new CWidgetFieldCheckBoxView($data['fields']['show_groupings_only']))
			->setFieldHint(
				makeHelpIcon([
					_('By default, this widget show individual metric items. By selecting this '), BR(),
					_('only groupings specified below will be displayed')
				])
			)
	)
	->addField(
		new CWidgetFieldItemGroupingView($data['fields']['group_by'])
	)
	->addField(
		new CWidgetFieldIntegerBoxView($data['fields']['show_lines'])
	)
	->show();
