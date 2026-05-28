import {useCallback} from 'react';
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator';
import Settings from '../../views/Settings';

import css from './SettingsPanel.module.less';

const PanelContainer = SpotlightContainerDecorator({enterTo: 'last-focused', restrict: 'self-only'}, 'div');

const SettingsPanel = ({onClose, onLibrariesChanged}) => {
	const handleScrimClick = useCallback(() => {
		onClose?.();
	}, [onClose]);

	return (
		<div className={css.overlay}>
			<div className={css.scrim} onClick={handleScrimClick} />
			<PanelContainer className={css.panel} spotlightId="settings-panel-container">
				<Settings panelMode onBack={onClose} onLibrariesChanged={onLibrariesChanged} />
			</PanelContainer>
		</div>
	);
};

export default SettingsPanel;
