<?php declare(strict_types = 0);


namespace Modules\RMEItemNavigator;

use Zabbix\Core\CWidget;

class Widget extends CWidget {

	public function getDefaultName(): string {
		return _('RME Item navigator');
	}

	public function getTranslationStrings(): array {
		return [
			'class.widget.js' => [
				'No data found' => _('No data found'),
				'Unexpected server error.' => _('Unexpected server error.')
			],
			'class.itemnavigator.js' => [
				'Uncategorized' => _('Uncategorized'),
				'%1$d of %1$d+ items are shown' => _('%1$d of %1$d+ items are shown'),
				'Host group' => _('Host group'),
				'Host name' => _('Host name'),
				'Host tag' => _('Host tag'),
				'Item tag' => _('Item tag')
			]
		];
	}
}
