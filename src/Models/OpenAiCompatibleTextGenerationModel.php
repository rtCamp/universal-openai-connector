<?php
/**
 * Text generation model for OpenAI-compatible endpoints.
 *
 * @since 1.0.0
 * @package rtCamp\UniversalOpenAiConnector
 */

declare( strict_types=1 );

namespace rtCamp\UniversalOpenAiConnector\Models;

use WordPress\AiClient\Providers\Http\DTO\Request;
use WordPress\AiClient\Providers\Http\Enums\HttpMethodEnum;
use WordPress\AiClient\Providers\OpenAiCompatibleImplementation\AbstractOpenAiCompatibleTextGenerationModel;
use rtCamp\UniversalOpenAiConnector\Provider\OpenAiCompatibleProvider;
use rtCamp\UniversalOpenAiConnector\Settings\OpenAiCompatibleSettings;

/**
 * Class OpenAiCompatibleTextGenerationModel.
 */
class OpenAiCompatibleTextGenerationModel extends AbstractOpenAiCompatibleTextGenerationModel {

	/**
	 * {@inheritDoc}
	 *
	 * @param array<\WordPress\AiClient\Messages\DTO\Message> $prompt The prompt array to prepare parameters for.
	 * @phpstan-param list<\WordPress\AiClient\Messages\DTO\Message> $prompt
	 *
	 * @return array<string, mixed> The prepared parameters for text generation.
	 */
	protected function prepareGenerateTextParams( array $prompt ): array {
		$params = parent::prepareGenerateTextParams( $prompt );

		$selected_model = OpenAiCompatibleSettings::get_selected_text_model();
		if ( '' !== $selected_model ) {
			$params['model'] = $selected_model;
		}

		// Many strict OpenAI-compatible backends reject OpenAI-specific parameters.
		// Only send them when talking to the real OpenAI API.
		$endpoint = OpenAiCompatibleSettings::get_endpoint_url();
		if ( strpos( $endpoint, 'api.openai.com' ) === false ) {
			unset( $params['response_format'] );
			unset( $params['n'] );
		}

		$params['reasoning_effort'] = 'none';

		return apply_filters( 'openai_compatible_text_generation_params', $params );
	}

	/**
	 * {@inheritDoc}
	 *
	 * Flatten text-only typed content arrays to plain strings so that strict
	 * OpenAI-compatible backends that do not accept the typed-content format
	 * (e.g. `[{"type":"text","text":"..."}]`) receive a simple string instead.
	 *
	 * @param array<\WordPress\AiClient\Messages\DTO\Message> $messages The messages array to prepare.
	 * @phpstan-param list<\WordPress\AiClient\Messages\DTO\Message> $messages
	 * @param string|null                                     $system_instruction Optional system instruction.
	 * @return array<string, mixed> The prepared messages array.
	 * @phpstan-return list<array<string, mixed>>
	 */
	protected function prepareMessagesParam( array $messages, ?string $system_instruction = null ): array {
		$messages = parent::prepareMessagesParam( $messages, $system_instruction );

		foreach ( $messages as &$message ) {
			if ( ! isset( $message['content'] ) || ! is_array( $message['content'] ) ) {
				continue;
			}

			$content = $message['content'];

			// Only flatten if all parts are plain text (no images, etc.).
			$all_text = true;
			foreach ( $content as $key => $part ) {
				if ( ! is_int( $key ) || ! is_array( $part ) || ( $part['type'] ?? '' ) !== 'text' ) {
					$all_text = false;
					break;
				}
			}

			if ( ! $all_text || count( $content ) <= 0 ) {
				continue;
			}

			$message['content'] = implode(
				'',
				array_map(
					static function ( $part ) {
						return $part['text'] ?? '';
					},
					$content
				)
			);
		}
		unset( $message );

		return $messages;
	}

	/**
	 * {@inheritDoc}
	 *
	 * @param \WordPress\AiClient\Providers\Http\Enums\HttpMethodEnum $method The HTTP method.
	 * @param string                                                  $path The request path.
	 * @param array<string, string|list<string>>                      $headers Optional headers.
	 * @param mixed                                                   $data Optional data.
	 * @return \WordPress\AiClient\Providers\Http\DTO\Request The created request.
	 */
	protected function createRequest( HttpMethodEnum $method, string $path, array $headers = [], $data = null ): Request {
		return new Request(
			$method,
			OpenAiCompatibleProvider::url( '/' . ltrim( $path, '/' ) ),
			$headers,
			$data,
			$this->getRequestOptions()
		);
	}
}
