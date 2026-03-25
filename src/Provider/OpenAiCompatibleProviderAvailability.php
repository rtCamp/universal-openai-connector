<?php
/**
 * Provider availability for OpenAI compatible provider.
 *
 * @since 1.0.0
 * @package rtCamp\UniversalOpenAiConnector
 */

declare( strict_types=1 );

namespace rtCamp\UniversalOpenAiConnector\Provider;

use WordPress\AiClient\Providers\Contracts\ProviderAvailabilityInterface;
use WordPress\AiClient\Providers\Http\DTO\ApiKeyRequestAuthentication;

/**
 * Class OpenAiCompatibleProviderAvailability.
 */
class OpenAiCompatibleProviderAvailability implements ProviderAvailabilityInterface {

	/**
	 * {@inheritDoc}
	 */
	public function isConfigured(): bool {
		if ( ! class_exists( \WordPress\AiClient\AiClient::class ) ) {
			return false;
		}

		$registry = \WordPress\AiClient\AiClient::defaultRegistry();

		if ( ! $registry->hasProvider( 'openai-compatible' ) ) {
			return false;
		}

		$auth = $registry->getProviderRequestAuthentication( 'openai-compatible' );
		if ( null === $auth ) {
			return false;
		}

		if ( $auth instanceof ApiKeyRequestAuthentication ) {
			return '' !== $auth->getApiKey();
		}

		return true;
	}
}
