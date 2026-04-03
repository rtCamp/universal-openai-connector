<?php
/**
 * Model metadata directory for OpenAI-compatible provider.
 *
 * @since 1.0.0
 * @package rtCamp\UniversalOpenAiConnector
 */

declare( strict_types=1 );

namespace rtCamp\UniversalOpenAiConnector\Metadata;

use WordPress\AiClient\Files\Enums\FileTypeEnum;
use WordPress\AiClient\Files\Enums\MediaOrientationEnum;
use WordPress\AiClient\Messages\Enums\ModalityEnum;
use WordPress\AiClient\Providers\ApiBasedImplementation\AbstractApiBasedModelMetadataDirectory;
use WordPress\AiClient\Providers\Models\DTO\ModelMetadata;
use WordPress\AiClient\Providers\Models\DTO\SupportedOption;
use WordPress\AiClient\Providers\Models\Enums\CapabilityEnum;
use WordPress\AiClient\Providers\Models\Enums\OptionEnum;
use rtCamp\UniversalOpenAiConnector\Settings\OpenAiCompatibleSettings;

/**
 * Class OpenAiCompatibleModelMetadataDirectory.
 */
class OpenAiCompatibleModelMetadataDirectory extends AbstractApiBasedModelMetadataDirectory {

	/**
	 * Returns metadata for selected text and image models.
	 *
	 * @since 1.0.0
	 *
	 * @return array<string, \WordPress\AiClient\Providers\Models\DTO\ModelMetadata>
	 */
	protected function sendListModelsRequest(): array {
		$models_map = [];

		$text_model = trim( OpenAiCompatibleSettings::get_effective_text_model() );
		if ( '' !== $text_model ) {
			$models_map[ $text_model ] = $this->createTextModelMetadata( $text_model );
		}

		$image_model = trim( OpenAiCompatibleSettings::get_effective_image_model() );
		if ( '' !== $image_model ) {
			if ( isset( $models_map[ $image_model ] ) ) {
				$models_map[ $image_model ] = $this->createCombinedModelMetadata( $image_model );
			} else {
				$models_map[ $image_model ] = $this->createImageModelMetadata( $image_model );
			}
		}

		ksort( $models_map );

		return $models_map;
	}

	/**
	 * Creates text generation metadata.
	 *
	 * @since 1.0.0
	 *
	 * @param string $model_id Model identifier.
	 */
	private function createTextModelMetadata( string $model_id ): ModelMetadata {
		return new ModelMetadata(
			$model_id,
			$model_id,
			[
				CapabilityEnum::textGeneration(),
				CapabilityEnum::chatHistory(),
			],
			[
				new SupportedOption( OptionEnum::systemInstruction() ),
				new SupportedOption( OptionEnum::candidateCount() ),
				new SupportedOption( OptionEnum::maxTokens() ),
				new SupportedOption( OptionEnum::temperature() ),
				new SupportedOption( OptionEnum::topP() ),
				new SupportedOption( OptionEnum::stopSequences() ),
				new SupportedOption( OptionEnum::frequencyPenalty() ),
				new SupportedOption( OptionEnum::presencePenalty() ),
				new SupportedOption( OptionEnum::outputMimeType(), [ 'text/plain', 'application/json' ] ),
				new SupportedOption( OptionEnum::outputSchema() ),
				new SupportedOption( OptionEnum::functionDeclarations() ),
				new SupportedOption( OptionEnum::customOptions() ),
				new SupportedOption( OptionEnum::outputModalities(), [ [ ModalityEnum::text() ] ] ),
				new SupportedOption( OptionEnum::inputModalities(), [ [ ModalityEnum::text() ], [ ModalityEnum::text(), ModalityEnum::image() ] ] ),
			]
		);
	}

	/**
	 * Creates image generation metadata.
	 *
	 * @since 1.0.0
	 *
	 * @param string $model_id Model identifier.
	 */
	private function createImageModelMetadata( string $model_id ): ModelMetadata {
		return new ModelMetadata(
			$model_id,
			$model_id,
			[
				CapabilityEnum::imageGeneration(),
			],
			[
				new SupportedOption( OptionEnum::inputModalities(), [ [ ModalityEnum::text() ] ] ),
				new SupportedOption( OptionEnum::outputModalities(), [ [ ModalityEnum::image() ] ] ),
				new SupportedOption( OptionEnum::candidateCount() ),
				new SupportedOption( OptionEnum::outputMimeType(), [ 'image/png' ] ),
				new SupportedOption( OptionEnum::outputFileType(), [ FileTypeEnum::inline(), FileTypeEnum::remote() ] ),
				new SupportedOption(
					OptionEnum::outputMediaOrientation(),
					[
						MediaOrientationEnum::square(),
						MediaOrientationEnum::landscape(),
						MediaOrientationEnum::portrait(),
					]
				),
				new SupportedOption( OptionEnum::outputMediaAspectRatio(), [ '1:1', '3:2', '2:3', '7:4', '4:7' ] ),
				new SupportedOption( OptionEnum::customOptions() ),
			]
		);
	}

	/**
	 * Creates metadata for a model selected as both text and image model.
	 *
	 * @since 1.0.0
	 *
	 * @param string $model_id Model identifier.
	 */
	private function createCombinedModelMetadata( string $model_id ): ModelMetadata {
		return new ModelMetadata(
			$model_id,
			$model_id,
			[
				CapabilityEnum::textGeneration(),
				CapabilityEnum::chatHistory(),
				CapabilityEnum::imageGeneration(),
			],
			[
				new SupportedOption( OptionEnum::systemInstruction() ),
				new SupportedOption( OptionEnum::candidateCount() ),
				new SupportedOption( OptionEnum::maxTokens() ),
				new SupportedOption( OptionEnum::temperature() ),
				new SupportedOption( OptionEnum::topP() ),
				new SupportedOption( OptionEnum::stopSequences() ),
				new SupportedOption( OptionEnum::frequencyPenalty() ),
				new SupportedOption( OptionEnum::presencePenalty() ),
				new SupportedOption( OptionEnum::outputMimeType(), [ 'text/plain', 'application/json' ] ),
				new SupportedOption( OptionEnum::outputSchema() ),
				new SupportedOption( OptionEnum::functionDeclarations() ),
				new SupportedOption( OptionEnum::customOptions() ),
				new SupportedOption( OptionEnum::outputModalities(), [ [ ModalityEnum::text() ] ] ),
				new SupportedOption( OptionEnum::inputModalities(), [ [ ModalityEnum::text() ], [ ModalityEnum::text(), ModalityEnum::image() ] ] ),
			]
		);
	}
}
