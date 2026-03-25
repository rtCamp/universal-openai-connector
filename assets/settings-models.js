/** global universalOpenAiConnectorSettings */

( function() {
	'use strict';

	const settings = window.universalOpenAiConnectorSettings || {};
	const i18n = settings.i18n || {};

	function clearAndFillSelect( selectEl, models, selectedModel ) {
		if ( ! selectEl ) {
			return;
		}

		selectEl.innerHTML = '';

		const emptyOption = document.createElement( 'option' );
		emptyOption.value = '';
		emptyOption.textContent = i18n.aiClientDefault || 'Use AI Client default';
		emptyOption.selected = ! selectedModel;
		selectEl.appendChild( emptyOption );

		if ( ! Array.isArray( models ) || models.length === 0 ) {
			if ( selectedModel ) {
				const fallbackOption = document.createElement( 'option' );
				fallbackOption.value = selectedModel;
				fallbackOption.textContent = selectedModel;
				fallbackOption.selected = true;
				selectEl.appendChild( fallbackOption );
			}
			return;
		}

		models.forEach( function( model ) {
			if ( ! model || typeof model.id !== 'string' || ! model.id.trim() ) {
				return;
			}

			const option = document.createElement( 'option' );
			option.value = model.id;
			option.textContent = model.name && model.name !== model.id
				? model.id + ' (' + model.name + ')'
				: model.id;

			if ( model.id === selectedModel ) {
				option.selected = true;
			}

			selectEl.appendChild( option );
		} );

		if ( selectedModel && ! models.some( function( model ) {
			return model.id === selectedModel;
		} ) ) {
			const customOption = document.createElement( 'option' );
			customOption.value = selectedModel;
			customOption.textContent = selectedModel + ' (saved)';
			customOption.selected = true;
			selectEl.insertBefore( customOption, selectEl.firstChild );
		}
	}

	function setStatus( statusEl, message, isError ) {
		if ( ! statusEl ) {
			return;
		}
		statusEl.textContent = message || '';
		statusEl.style.color = isError ? '#d63638' : '#50575e';
	}

	function init() {
		const textModelSelect = document.getElementById( 'universal_openai_connector_settings-text-model' );
		const imageModelSelect = document.getElementById( 'universal_openai_connector_settings-image-model' );

		if ( ! textModelSelect || ! imageModelSelect ) {
			return;
		}

		const textStatus = document.getElementById( 'openai-compatible-text-model-status' );
		const imageStatus = document.getElementById( 'openai-compatible-image-model-status' );
		const ajaxUrl = settings.ajaxUrl || '';
		const selectedTextModel = settings.selectedTextModel || '';
		const selectedImageModel = settings.selectedImageModel || '';

		setStatus( textStatus, i18n.loading || 'Loading models...', false );
		setStatus( imageStatus, i18n.loading || 'Loading models...', false );

		window.fetch( ajaxUrl, { credentials: 'same-origin' } )
			.then( function( response ) {
				return response.json();
			} )
			.then( function( payload ) {
				if ( ! payload || ! payload.success || ! Array.isArray( payload.data ) ) {
					throw new Error( i18n.errorLoad || 'Could not load models from endpoint.' );
				}

				clearAndFillSelect( textModelSelect, payload.data, selectedTextModel );
				clearAndFillSelect( imageModelSelect, payload.data, selectedImageModel );

				const countText = String( payload.data.length ) + ' ' + ( i18n.loaded || 'models loaded.' );
				setStatus( textStatus, countText, false );
				setStatus( imageStatus, countText, false );
			} )
			.catch( function( error ) {
				const message = ( error && error.message ) ? error.message : ( i18n.errorLoad || 'Could not load models from endpoint.' );
				setStatus( textStatus, message, true );
				setStatus( imageStatus, message, true );
			} );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
}() );
