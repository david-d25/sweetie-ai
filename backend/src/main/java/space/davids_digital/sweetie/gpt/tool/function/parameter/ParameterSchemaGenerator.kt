package space.davids_digital.sweetie.gpt.tool.function.parameter

import com.google.gson.JsonArray
import com.google.gson.JsonObject
import kotlin.reflect.KClass
import kotlin.reflect.KType
import kotlin.reflect.full.primaryConstructor
import kotlin.reflect.full.createType

class ParameterSchemaGenerator {
    fun generateString(parameterClass: KClass<*>): String {
        val rootType = parameterClass.createType()
        return generateInternal(rootType, listOf()).toString()
    }

    private fun generateInternal(
        kType: KType,
        path: List<KType>,
        description: String? = null,
        enum: List<String>? = null
    ): JsonObject {
        // Prevent infinite recursion on circular references
        if (path.contains(kType)) {
            throw IllegalArgumentException("Circular reference detected: $path -> $kType")
        }

        val result = JsonObject()
        val classifier = kType.classifier as? KClass<*>
            ?: throw IllegalArgumentException("Unsupported classifier: ${kType.classifier}")

        // Handle data classes (objects)
        if (classifier.isData) {
            val properties = JsonObject()
            val requiredPropertyNames = JsonArray()
            classifier.primaryConstructor?.parameters?.forEach { param ->
                // Extract annotations for description or enum on the parameter's class
                var paramDescription: String? = null
                var paramEnum: List<String>? = null
                val paramType = param.type
                val paramClass = param.type.classifier as? KClass<*>
                paramClass?.annotations?.forEach { annotation ->
                    when (annotation) {
                        is Description -> paramDescription = annotation.value
                        is Enum -> paramEnum = annotation.value.toList()
                    }
                }

                // Recursive call for nested types
                val schema = generateInternal(
                    paramType,
                    path + kType,
                    paramDescription,
                    paramEnum
                )

                properties.add(param.name, schema)
                if (!param.isOptional) {
                    requiredPropertyNames.add(param.name)
                }
            }
            result.addProperty("type", "object")
            result.add("properties", properties)
            result.add("required", requiredPropertyNames)
        } else {
            // Handle primitives, enums, and lists
            when {
                classifier == String::class -> result.addProperty("type", "string")
                classifier == Int::class || classifier == Long::class -> result.addProperty("type", "integer")
                classifier == Float::class || classifier == Double::class -> result.addProperty("type", "number")
                classifier == Boolean::class -> result.addProperty("type", "boolean")

                // Support for List<T> and MutableList<T>
                classifier == List::class || classifier == MutableList::class -> {
                    result.addProperty("type", "array")
                    // Expect exactly one generic argument
                    val arg = kType.arguments.firstOrNull()?.type
                        ?: throw IllegalArgumentException("List type argument missing for $kType")
                    val itemsSchema = generateInternal(arg, path + kType)
                    result.add("items", itemsSchema)
                }

                else -> throw IllegalArgumentException("Unsupported parameter type: $kType")
            }
        }

        // Add optional description and enum metadata
        description?.let {
            result.addProperty("description", it)
        }
        enum?.let {
            val enumArray = JsonArray()
            it.forEach(enumArray::add)
            result.add("enum", enumArray)
        }

        return result
    }
}
