package space.davids_digital.sweetie.gpt.tool.function.parameter

@Target(AnnotationTarget.PROPERTY)
@Retention(AnnotationRetention.RUNTIME)
annotation class Enum(vararg val value: String)
