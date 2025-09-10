<?php declare(strict_types=0);


namespace Modules\RMEItemNavigator\Includes;

use CButton,
	CButtonLink,
	CCol,
	CDiv,
	CRow,
	CSelect,
	CSpan,
	CTable,
	CTemplateTag,
	CTextBox,
	CWidgetFieldView;

class CWidgetFieldItemGroupingView extends CWidgetFieldView {

	public const ZBX_STYLE_ITEM_GROUPING = 'item-grouping';

	public function __construct(CWidgetFieldItemGrouping $field) {
		$this->field = $field;
	}

	public function getView(): CTable {
		return (new CTable())
			->setId($this->field->getName().'-table')
			->addClass(self::ZBX_STYLE_ITEM_GROUPING)
			->addClass(ZBX_STYLE_TABLE_INITIAL_WIDTH)
			->addClass(ZBX_STYLE_LIST_NUMBERED)
			->setFooter(new CRow(
				(new CCol(
					(new CButtonLink(_('Add')))
						->setId('add-row')
						->addClass('element-table-add')
				))->setColSpan(4)
			));
	}

	public function getJavaScript(): string {
		return '
			CWidgetForm.addField(
				new ItemNavigator_CWidgetFieldItemGrouping('.json_encode([
					'name' => $this->field->getName(),
					'form_name' => $this->form_name,
					'value' => $this->field->getValue(),
					'max_rows' => CWidgetFieldItemGrouping::MAX_ROWS
				]).')
			);
		';
	}

	public function getTemplates(): array {
		return [
			new CTemplateTag($this->field->getName().'-row-tmpl',
				(new CRow([
					(new CCol((new CDiv())->addClass(ZBX_STYLE_DRAG_ICON)))->addClass(ZBX_STYLE_TD_DRAG_ICON),
					(new CSpan(':'))->addClass(ZBX_STYLE_LIST_NUMBERED_ITEM),
					(new CSelect($this->field->getName().'[#{rowNum}][attribute]'))
						->addOptions(CSelect::createOptionsFromArray([
							CWidgetFieldItemGrouping::GROUP_BY_HOST_GROUP => _('Host group'),
							CWidgetFieldItemGrouping::GROUP_BY_HOST_NAME => _('Host name'),
							CWidgetFieldItemGrouping::GROUP_BY_HOST_TAG => _('Host tag value'),
							CWidgetFieldItemGrouping::GROUP_BY_ITEM_TAG => _('Item tag value')
						]))
						->setValue('#{attribute}')
						->setId($this->field->getName().'_#{rowNum}_attribute')
						->setWidth(ZBX_TEXTAREA_FILTER_SMALL_WIDTH),
					(new CCol(
						(new CTextBox($this->field->getName().'[#{rowNum}][tag_name]', '#{tag_name}', false))
							->setId($this->field->getName().'_#{rowNum}_tag_name')
							->setWidth(ZBX_TEXTAREA_MEDIUM_WIDTH)
							->setAttribute('placeholder', _('tag'))
					))->setWidth(ZBX_TEXTAREA_MEDIUM_WIDTH),
					(new CDiv(
						(new CButton($this->field->getName().'[#{rowNum}][remove]', _('Remove')))
							->addClass(ZBX_STYLE_BTN_LINK)
							->addClass('element-table-remove')
					))
				]))->addClass('form_row')
			)
		];
	}
}
