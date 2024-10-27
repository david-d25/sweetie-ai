package space.davids_digital.sweetie.gpt.tool.function

import space.davids_digital.sweetie.gpt.InvocationContext
import space.davids_digital.sweetie.model.VkMessageModel
import kotlin.reflect.KClass

interface AssistantFunction<P : Any> {
    fun getName(): String
    fun getDescription(): String? = null
    fun getParametersClass(): KClass<P>
    fun isVisible(message: VkMessageModel, invocationContext: InvocationContext): Boolean = true
    suspend fun call(parameters: P, message: VkMessageModel, invocationContext: InvocationContext): String
}