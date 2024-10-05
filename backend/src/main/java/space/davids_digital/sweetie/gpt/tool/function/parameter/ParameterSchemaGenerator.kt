package space.davids_digital.sweetie.gpt.tool.function.parameter

import com.google.gson.JsonArray
import com.google.gson.JsonObject
import kotlin.reflect.KClass
import kotlin.reflect.full.primaryConstructor

class ParameterSchemaGenerator {
    fun generateString(parameterClass: KClass<*>): String {
        return generateInternal(parameterClass, listOf()).toString()
    }

    private fun generateInternal(
        parameterClass: KClass<*>,
        path: List<KClass<*>>,
        description: String? = null,
        enum: List<String>? = null
    ): JsonObject {
        if (path.contains(parameterClass)) {
            throw IllegalArgumentException("Circular reference detected: $path")
        }
        val result = JsonObject()
        if (parameterClass.isData) {
            val properties = JsonObject()
            val requiredPropertyNames = JsonArray()
            parameterClass.primaryConstructor?.parameters?.forEach {
                var paramDescription: String? = null
                var paramEnum: List<String>? = null
                val clazz = it.type.classifier as KClass<*>
                clazz.annotations.forEach { annotation ->
                    if (annotation is Description) {
                        paramDescription = annotation.value
                    }
                    if (annotation is Enum) {
                        paramEnum = annotation.value.toList()
                    }
                }
                properties.add(it.name, generateInternal(clazz, path + parameterClass, paramDescription, paramEnum))
                if (!it.isOptional) {
                    requiredPropertyNames.add(it.name)
                }
            }
            result.addProperty("type", "object")
            result.add("properties", properties)
            result.add("required", requiredPropertyNames)
        } else {
            when (parameterClass) {
                String::class -> result.addProperty("type", "string")
                Int::class -> result.addProperty("type", "integer")
                Long::class -> result.addProperty("type", "integer")
                Float::class -> result.addProperty("type", "number")
                Double::class -> result.addProperty("type", "number")
                Boolean::class -> result.addProperty("type", "boolean")
                else -> throw IllegalArgumentException("Unsupported parameter type: $parameterClass")
            }
        }
        if (description != null) {
            result.addProperty("description", description)
        }
        if (enum != null) {
            val enumArray = JsonArray()
            enum.forEach { enumArray.add(it) }
            result.add("enum", enumArray)
        }
        return result
    }
}