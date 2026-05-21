/** global universalOpenAiConnectorSettings */

( function() {
	'use strict';

	// Retrieve local settings and translations passed from PHP.
	const settings = window.universalOpenAiConnectorSettings || {};
	const i18n = settings.i18n || {};

	/**
	 * Helper function to clear and populate a SELECT element with models.
	 *
	 * @param {HTMLSelectElement} selectEl      The select element to populate.
	 * @param {Array}             models        List of available models.
	 * @param {string}            selectedModel The currently selected model value.
	 */
	function clearAndFillSelect( selectEl, models, selectedModel ) {
		if ( ! selectEl ) {
			return;
		}

		// Clear existing options.
		selectEl.innerHTML = '';

		// Create and append the default "Use AI Client default" option.
		const emptyOption = document.createElement( 'option' );
		emptyOption.value = '';
		emptyOption.textContent = i18n.aiClientDefault || 'Use AI Client default';
		emptyOption.selected = ! selectedModel;
		selectEl.appendChild( emptyOption );

		// If no models were fetched, show the currently selected model as fallback.
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

		// Populate select options from the fetched models array.
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

		// If the saved model is not in the fetched models list, preserve it as a custom/saved option.
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

	/**
	 * Sets the status message and styling for model loading.
	 *
	 * @param {HTMLElement} statusEl The element displaying the status.
	 * @param {string}      message  The message to display.
	 * @param {boolean}     isError  Whether this is an error message.
	 */
	function setStatus( statusEl, message, isError ) {
		if ( ! statusEl ) {
			return;
		}
		statusEl.textContent = message || '';
		statusEl.style.color = isError ? '#d63638' : '#50575e';
	}

	/**
	 * Simple HTML escaping utility to prevent XSS.
	 *
	 * @param {string} str Unescaped HTML string.
	 * @return {string} Escaped HTML string.
	 */
	function escHtml( str ) {
		return String( str )
			.replace( /&/g, '&amp;' )
			.replace( /</g, '&lt;' )
			.replace( />/g, '&gt;' )
			.replace( /"/g, '&quot;' );
	}

	/**
	 * Initializes the endpoint preset combobox component.
	 */
	function initEndpointPreset() {
		const wrapper = document.getElementById( 'openai-compatible-endpoint-combobox' );
		const hiddenInput = document.getElementById( 'universal_openai_connector_settings-endpoint-url' );

		// Return early if the required combobox wrapper elements are not present.
		if ( ! wrapper || ! hiddenInput ) {
			return;
		}

		const searchInput = document.getElementById( 'universal_openai_connector_settings-endpoint-url-search' );
		const list = wrapper.querySelector( 'ul[role="listbox"]' );

		if ( ! searchInput || ! list ) {
			return;
		}

		// Retrieve toggle button after checking wrapper and search elements.
		const toggleBtn = document.getElementById( 'openai-compatible-endpoint-toggle' );

		// Parse the presets data attribute passed from PHP.
		let presets = [];
		try {
			presets = JSON.parse( wrapper.dataset.presets || '[]' );
		} catch ( e ) {
			presets = [];
		}

		// Helper to normalize input for case-insensitive search.
		function normalise( str ) {
			return String( str ).toLowerCase().trim();
		}

		// Helper to highlight matching query text in the preset items.
		function highlight( text, query ) {
			if ( ! query ) {
				return escHtml( text );
			}
			const idx = normalise( text ).indexOf( normalise( query ) );
			if ( idx === -1 ) {
				return escHtml( text );
			}
			return escHtml( text.slice( 0, idx ) ) +
				'<mark style="background:#fff3cd; padding:0;">' + escHtml( text.slice( idx, idx + query.length ) ) + '</mark>' +
				escHtml( text.slice( idx + query.length ) );
		}

		// Constructs the dropdown list options based on user search query.
		function buildList( query ) {
			list.innerHTML = '';
			const q = normalise( query );

			// Filter presets based on user query.
			const filtered = q
				? presets.filter( function( p ) {
					return normalise( p.label ).includes( q ) || normalise( p.url ).includes( q );
				} )
				: presets;

			const exactMatch = presets.some( function( p ) {
				return normalise( p.url ) === q;
			} );

			// If the user typed a custom URL not in the presets, show an option to use it.
			if ( q && ! exactMatch ) {
				const li = document.createElement( 'li' );
				li.setAttribute( 'role', 'option' );
				li.dataset.url = query;
				li.style.cssText = 'padding:8px 12px; cursor:pointer; border-bottom:1px solid #f0f0f1;';
				li.innerHTML = '<em style="color:#2271b1;">Add &ldquo;' + escHtml( query ) + '&rdquo;</em>';
				list.appendChild( li );
			}

			// Render preset options matching the filter.
			filtered.forEach( function( p ) {
				const li = document.createElement( 'li' );
				li.setAttribute( 'role', 'option' );
				li.dataset.url = p.url;
				li.style.cssText = 'padding:8px 12px; cursor:pointer;';
				li.innerHTML =
					'<strong style="display:block; font-size:13px;">' + highlight( p.label, query ) + '</strong>' +
					'<span style="font-size:12px; color:#646970;">' + highlight( p.url, query ) + '</span>';
				list.appendChild( li );
			} );
		}

		// Opens the presets dropdown list.
		function openList( query ) {
			buildList( query );
			list.style.display = 'block';
			if ( toggleBtn ) {
				toggleBtn.style.transform = 'rotate(180deg)';
			}
		}

		// Closes the presets dropdown list.
		function closeList() {
			list.style.display = 'none';
			if ( toggleBtn ) {
				toggleBtn.style.transform = '';
			}
		}

		// Sets the selected URL to both the hidden inputs and visible input.
		function selectUrl( url ) {
			hiddenInput.value = url;
			searchInput.value = url;
			closeList();
		}

		// Highlights the hovered or navigated dropdown item.
		function highlightItem( li ) {
			list.querySelectorAll( 'li' ).forEach( function( el ) {
				el.style.background = '';
			} );
			if ( li ) {
				li.style.background = '#f0f6fc';
			}
		}

		// Event listener to open dropdown list on search input focus.
		searchInput.addEventListener( 'focus', function() {
			openList( searchInput.value );
		} );

		// Event listener to filter dropdown options as the user types.
		searchInput.addEventListener( 'input', function() {
			hiddenInput.value = searchInput.value;
			openList( searchInput.value );
		} );

		// Event listener to toggle the visibility of the presets dropdown.
		if ( toggleBtn ) {
			toggleBtn.addEventListener( 'click', function() {
				if ( list.style.display === 'none' ) {
					openList( searchInput.value );
					searchInput.focus();
				} else {
					closeList();
				}
			} );
		}

		// Prevent input focus loss when clicking list items.
		list.addEventListener( 'mousedown', function( e ) {
			e.preventDefault();
		} );

		// Event listener to select the clicked preset option.
		list.addEventListener( 'click', function( e ) {
			const li = e.target.closest( 'li[data-url]' );
			if ( li ) {
				selectUrl( li.dataset.url );
			}
		} );

		// Event listener to highlight options on mouse hover.
		list.addEventListener( 'mouseover', function( e ) {
			const li = e.target.closest( 'li[data-url]' );
			if ( li ) {
				highlightItem( li );
			}
		} );

		// Event listener for keyboard navigation (Arrow Up, Arrow Down, Enter, Escape).
		searchInput.addEventListener( 'keydown', function( e ) {
			if ( list.style.display === 'none' ) {
				if ( e.key === 'ArrowDown' || e.key === 'ArrowUp' ) {
					e.preventDefault();
					openList( searchInput.value );
				}
				return;
			}

			const items = Array.from( list.querySelectorAll( 'li[data-url]' ) );
			const activeIndex = items.findIndex( function( el ) {
				return el.style.background !== '';
			} );

			if ( e.key === 'ArrowDown' ) {
				e.preventDefault();
				const next = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
				highlightItem( items[ next ] );
			} else if ( e.key === 'ArrowUp' ) {
				e.preventDefault();
				const prev = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
				highlightItem( items[ prev ] );
			} else if ( e.key === 'Enter' ) {
				e.preventDefault();
				const highlighted = items[ activeIndex ];
				if ( highlighted ) {
					selectUrl( highlighted.dataset.url );
				} else {
					hiddenInput.value = searchInput.value;
					closeList();
				}
			} else if ( e.key === 'Escape' ) {
				closeList();
			}
		} );

		// Event listener to close the dropdown list when focus leaves the combobox.
		searchInput.addEventListener( 'blur', function() {
			// Delay execution slightly to allow list click event handler to fire first.
			setTimeout( function() {
				// Use searchInput's ownerDocument to access the active element to prevent eslint global activeElement warning.
				if ( ! wrapper.contains( searchInput.ownerDocument.activeElement ) ) {
					hiddenInput.value = searchInput.value;
					closeList();
				}
			}, 150 );
		} );
	}

	/**
	 * Main initialization function to fetch and populate model lists on page load.
	 */
	function init() {
		// Initialize the endpoint combobox.
		initEndpointPreset();

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

		// Set initial loading status messages.
		setStatus( textStatus, i18n.loading || 'Loading models...', false );
		setStatus( imageStatus, i18n.loading || 'Loading models...', false );

		// Fetch models list from WordPress admin-ajax endpoint.
		window.fetch( ajaxUrl, { credentials: 'same-origin' } )
			.then( function( response ) {
				return response.json();
			} )
			.then( function( payload ) {
				if ( ! payload || ! payload.success || ! Array.isArray( payload.data ) ) {
					throw new Error( i18n.errorLoad || 'Could not load models from endpoint.' );
				}

				// Populate SELECT elements with retrieved models.
				clearAndFillSelect( textModelSelect, payload.data, selectedTextModel );
				clearAndFillSelect( imageModelSelect, payload.data, selectedImageModel );

				// Display the loaded count status.
				const countText = String( payload.data.length ) + ' ' + ( i18n.loaded || 'models loaded.' );
				setStatus( textStatus, countText, false );
				setStatus( imageStatus, countText, false );
			} )
			.catch( function( error ) {
				// Handle and display model fetching errors.
				const message = ( error && error.message ) ? error.message : ( i18n.errorLoad || 'Could not load models from endpoint.' );
				setStatus( textStatus, message, true );
				setStatus( imageStatus, message, true );
			} );
	}

	// Trigger initialization when DOM is ready.
	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
}() );
