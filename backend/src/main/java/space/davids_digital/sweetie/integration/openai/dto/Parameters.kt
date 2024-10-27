package space.davids_digital.sweetie.integration.openai.dto

import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonEncoder

@Serializable(with = Parameters.JsonDataSerializer::class)
data class Parameters(val schema: JsonElement) {
    object JsonDataSerializer: KSerializer<Parameters> {
        override val descriptor = JsonElement.serializer().descriptor

        override fun deserialize(decoder: Decoder): Parameters {
            require(decoder is JsonDecoder)
            return Parameters(decoder.decodeJsonElement())
        }

        override fun serialize(encoder: Encoder, value: Parameters) {
            require(encoder is JsonEncoder)
            encoder.encodeJsonElement(value.schema)
        }
    }

    companion object {
        fun fromJsonString(json: String) = Parameters(Json.parseToJsonElement(json))
    }
}
