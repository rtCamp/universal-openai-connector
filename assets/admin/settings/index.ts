/**
 * Universal OpenAI Connector Settings Models Script
 *
 * This handles the loading of available models from the OpenAI Compatible endpoint
 * and populates selection choices dynamically in the WordPress admin panel.
 */

import './style.scss';

// Type definitions to help TypeScript understand the data structures.
interface UniversalOpenAiConnectorSettingsGlobal {
	ajaxUrl?: string;
	selectedTextModel?: string;
	selectedImageModel?: string;
	i18n?: {
		loading?: string;
		loaded?: string;
		errorLoad?: string;
		aiClientDefault?: string;
	};
}

declare global {
	interface Window {
		universalOpenAiConnectorSettings?: UniversalOpenAiConnectorSettingsGlobal;
	}
}

interface OpenAiCompatibleModel {
	id?: string;
	name?: string;
	is_image?: boolean;
}

interface Preset {
	label: string;
	url: string;
}

// Retrieve local settings and translations passed from PHP.
const settings = window.universalOpenAiConnectorSettings || {};
const i18n = settings.i18n || {};

/**
 * Helper function to clear and populate a SELECT element with models.
 *
 * @param {HTMLSelectElement|null}  selectEl      The select element to populate.
 * @param {OpenAiCompatibleModel[]} models        List of available models.
 * @param {string}                  selectedModel The currently selected model value.
 */
function clearAndFillSelect(
	selectEl: HTMLSelectElement | null,
	models: OpenAiCompatibleModel[],
	selectedModel: string,
): void {
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
 * @param {HTMLElement|null} statusEl The element displaying the status.
 * @param {string}           message  The message to display.
 * @param {boolean}          isError  Whether this is an error message.
 */
function setStatus( statusEl: HTMLElement | null, message: string, isError: boolean ): void {
	if ( ! statusEl ) {
		return;
	}
	statusEl.textContent = message || '';
	statusEl.classList.toggle( 'openai-compatible-model-status--error', isError );
}

/**
 * Simple HTML escaping utility to prevent XSS.
 *
 * @param {string} str Unescaped HTML string.
 * @return {string} Escaped HTML string.
 *
 * @since 1.0.1
 */
function escHtml( str: string ): string {
	return String( str )
		.replace( /&/g, '&amp;' )
		.replace( /</g, '&lt;' )
		.replace( />/g, '&gt;' )
		.replace( /"/g, '&quot;' );
}

/**
 * Initializes the endpoint preset combobox component.
 *
 * @param {Function} [onEndpointCommit] Callback function when an endpoint is committed.
 * @since 1.0.1
 */
function initEndpointPreset( onEndpointCommit?: ( url: string ) => void ): void {
	const wrapper = document.getElementById( 'openai-compatible-endpoint-combobox' ) as HTMLDivElement | null;
	const hiddenInput = document.getElementById( 'universal_openai_connector_settings-endpoint-url' ) as HTMLInputElement | null;

	// Return early if the required combobox wrapper elements are not present.
	if ( ! wrapper || ! hiddenInput ) {
		return;
	}

	const searchInput = document.getElementById( 'universal_openai_connector_settings-endpoint-url-search' ) as HTMLInputElement | null;
	const list = wrapper.querySelector( 'ul[role="listbox"]' );

	if ( ! searchInput || ! list ) {
		return;
	}

	// Retrieve toggle button after checking wrapper and search elements.
	const toggleBtn = document.getElementById( 'openai-compatible-endpoint-toggle' ) as HTMLButtonElement | null;

	// Set the inline style explicitly so list.style.display is always authoritative
	// (CSS-only display:none leaves list.style.display as '', breaking the toggle check).
	list.style.display = 'none';

	// Track the last committed URL to avoid redundant re-fetches (e.g. blur after selectUrl).
	let committedUrl = searchInput.value;

	// Calls onEndpointCommit only when the URL has actually changed.
	function commitUrl( url: string ): void {
		if ( url === committedUrl ) {
			return;
		}
		committedUrl = url;
		if ( typeof onEndpointCommit === 'function' ) {
			onEndpointCommit( url );
		}
	}

	// Parse the presets data attribute passed from PHP.
	let presets: Preset[] = [];
	try {
		presets = JSON.parse( wrapper.dataset.presets || '[]' ) as Preset[];
	} catch ( e ) {
		presets = [];
	}

	// Helper to normalize input for case-insensitive search.
	function normalise( str: string ): string {
		return String( str ).toLowerCase().trim();
	}

	// Helper to highlight matching query text in the preset items.
	function highlight( text: string, query: string ): string {
		if ( ! query ) {
			return escHtml( text );
		}
		const idx = normalise( text ).indexOf( normalise( query ) );
		if ( idx === -1 ) {
			return escHtml( text );
		}
		return escHtml( text.slice( 0, idx ) ) +
			'<mark class="openai-compatible-endpoint-highlight">' + escHtml( text.slice( idx, idx + query.length ) ) + '</mark>' +
			escHtml( text.slice( idx + query.length ) );
	}

	// Constructs the dropdown list options based on user search query.
	function buildList( query: string ): void {
		list!.innerHTML = '';
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

		let optIndex = 0;

		// If the user typed a custom URL not in the presets, show an option to use it.
		if ( q && ! exactMatch ) {
			const li = document.createElement( 'li' );
			li.setAttribute( 'role', 'option' );
			li.setAttribute( 'aria-selected', 'false' );
			li.id = list!.id + '-opt-' + optIndex++;
			li.dataset.url = query;
			li.className = 'openai-compatible-endpoint-option openai-compatible-endpoint-option--custom';
			li.innerHTML = '<em class="openai-compatible-endpoint-option-custom-label">Add &ldquo;' + escHtml( query ) + '&rdquo;</em>';
			list!.appendChild( li );
		}

		// Render preset options matching the filter.
		filtered.forEach( function( p ) {
			const li = document.createElement( 'li' );
			li.setAttribute( 'role', 'option' );
			li.setAttribute( 'aria-selected', 'false' );
			li.id = list!.id + '-opt-' + optIndex++;
			li.dataset.url = p.url;
			li.className = 'openai-compatible-endpoint-option';
			li.innerHTML =
				'<strong class="openai-compatible-endpoint-option-label">' + highlight( p.label, query ) + '</strong>' +
				'<span class="openai-compatible-endpoint-option-url">' + highlight( p.url, query ) + '</span>';
			list!.appendChild( li );
		} );
	}

	// Opens the presets dropdown list.
	function openList( query: string ): void {
		buildList( query );
		list!.style.display = 'block';
		searchInput.setAttribute( 'aria-expanded', 'true' );
		if ( toggleBtn ) {
			toggleBtn.setAttribute( 'aria-expanded', 'true' );
		}
	}

	// Closes the presets dropdown list.
	function closeList(): void {
		list!.style.display = 'none';
		searchInput.setAttribute( 'aria-expanded', 'false' );
		searchInput.removeAttribute( 'aria-activedescendant' );
		if ( toggleBtn ) {
			toggleBtn.setAttribute( 'aria-expanded', 'false' );
		}
	}

	// Sets the selected URL to both the hidden inputs and visible input.
	function selectUrl( url: string ): void {
		hiddenInput.value = url;
		searchInput.value = url;
		closeList();
		commitUrl( url );
	}

	// Highlights the hovered or navigated dropdown item.
	function highlightItem( li: HTMLLIElement | null ): void {
		list!.querySelectorAll( 'li' ).forEach( function( el ) {
			el.classList.remove( 'openai-compatible-endpoint-option--active' );
			el.setAttribute( 'aria-selected', 'false' );
		} );
		if ( li ) {
			li.classList.add( 'openai-compatible-endpoint-option--active' );
			li.setAttribute( 'aria-selected', 'true' );
			searchInput.setAttribute( 'aria-activedescendant', li.id );
		} else {
			searchInput.removeAttribute( 'aria-activedescendant' );
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
		const target = e.target as HTMLElement | null;
		if ( ! target ) {
			return;
		}
		const li = target.closest( 'li[data-url]' );
		if ( li && li.dataset.url ) {
			selectUrl( li.dataset.url );
		}
	} );

	// Event listener to highlight options on mouse hover.
	list.addEventListener( 'mouseover', function( e ) {
		const target = e.target as HTMLElement | null;
		if ( ! target ) {
			return;
		}
		const li = target.closest( 'li[data-url]' );
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

		const items = Array.from( list.querySelectorAll<HTMLLIElement>( 'li[data-url]' ) );
		const activeIndex = items.findIndex( function( el ) {
			return el.classList.contains( 'openai-compatible-endpoint-option--active' );
		} );

		if ( e.key === 'ArrowDown' ) {
			e.preventDefault();
			const next = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
			highlightItem( items[ next ] || null );
		} else if ( e.key === 'ArrowUp' ) {
			e.preventDefault();
			const prev = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
			highlightItem( items[ prev ] || null );
		} else if ( e.key === 'Enter' ) {
			e.preventDefault();
			const highlighted = items[ activeIndex ];
			if ( highlighted && highlighted.dataset.url ) {
				selectUrl( highlighted.dataset.url );
			} else {
				hiddenInput.value = searchInput.value;
				closeList();
				commitUrl( searchInput.value );
			}
		} else if ( e.key === 'Escape' ) {
			closeList();
		}
	} );

	// Event listener to close the dropdown list when focus leaves the combobox.
	searchInput.addEventListener( 'blur', function() {
		// Delay execution slightly to allow list click event handler to fire first.
		setTimeout( function() {
			const doc = searchInput.ownerDocument;
			// Use searchInput's ownerDocument to access the active element to prevent eslint global activeElement warning.
			if ( doc && doc.activeElement && ! wrapper.contains( doc.activeElement ) ) {
				hiddenInput.value = searchInput.value;
				closeList();
				commitUrl( searchInput.value );
			}
		}, 150 );
	} );
}

/**
 * Main initialization function to fetch and populate model lists on page load.
 */
function init(): void {
	const textModelSelect = document.getElementById( 'universal_openai_connector_settings-text-model' ) as HTMLSelectElement | null;
	const imageModelSelect = document.getElementById( 'universal_openai_connector_settings-image-model' ) as HTMLSelectElement | null;

	if ( ! textModelSelect || ! imageModelSelect ) {
		initEndpointPreset();
		return;
	}

	const textStatus = document.getElementById( 'openai-compatible-text-model-status' );
	const imageStatus = document.getElementById( 'openai-compatible-image-model-status' );
	const ajaxUrl = settings.ajaxUrl || '';

	// Generation counter: each new fetch increments it so stale responses are discarded.
	let fetchGeneration = 0;

	/**
	 * Fetches the model list and refreshes both SELECT elements.
	 *
	 * @param {string|null} overrideUrl Endpoint URL override, or null to use the saved setting. Pass '' to preview the default endpoint.
	 */
	function fetchModels( overrideUrl: string | null ): void {
		const gen = ++fetchGeneration;

		setStatus( textStatus, i18n.loading || 'Loading models...', false );
		setStatus( imageStatus, i18n.loading || 'Loading models...', false );

		// Capture current select values before the async response arrives.
		const currentTextModel = textModelSelect!.value;
		const currentImageModel = imageModelSelect!.value;

		// POST so the optional endpoint_url body parameter reaches the AJAX handler.
		// null means "no override"; any string (including '') is sent explicitly so PHP can
		// distinguish a user-cleared field from an absent parameter.
		const body = new window.URLSearchParams();
		if ( null !== overrideUrl ) {
			body.set( 'endpoint_url', overrideUrl );
		}

		window.fetch( ajaxUrl, { method: 'POST', credentials: 'same-origin', body } )
			.then( function( response ) {
				return response.json() as Promise<{ success?: boolean; data?: OpenAiCompatibleModel[] }>;
			} )
			.then( function( payload ) {
				// Discard response if a newer fetch has already been dispatched.
				if ( gen !== fetchGeneration ) {
					return;
				}

				if ( ! payload || ! payload.success || ! Array.isArray( payload.data ) ) {
					throw new Error( i18n.errorLoad || 'Could not load models from endpoint.' );
				}

				// Filter models for text and image SELECT elements.
				const textModels = payload.data.filter( function( model ) {
					return model && ! model.is_image;
				} );
				const imageModels = payload.data.filter( function( model ) {
					return model && model.is_image;
				} );

				// Populate SELECT elements, preserving the user's current selection.
				clearAndFillSelect( textModelSelect, textModels, currentTextModel );
				clearAndFillSelect( imageModelSelect, imageModels, currentImageModel );

				const loadedMsg = i18n.loaded || 'models loaded.';
				setStatus( textStatus, String( textModels.length ) + ' ' + loadedMsg, false );
				setStatus( imageStatus, String( imageModels.length ) + ' ' + loadedMsg, false );
			} )
			.catch( function( error: unknown ) {
				if ( gen !== fetchGeneration ) {
					return;
				}
				const err = error as { message?: string } | null;
				const message = ( err && err.message ) ? err.message : ( i18n.errorLoad || 'Could not load models from endpoint.' );
				setStatus( textStatus, message, true );
				setStatus( imageStatus, message, true );
			} );
	}

	// Initialize the endpoint combobox; re-fetch models whenever the endpoint changes.
	initEndpointPreset( fetchModels );

	// Initial fetch using the saved endpoint (null = no override).
	fetchModels( null );
}

// Trigger initialization when DOM is ready.
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
