package space.davids_digital.sweetie.command

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component

@Component
class CommandRegistry {
    companion object {
        private val log = LoggerFactory.getLogger(CommandRegistry::class.java)
    }

    private val commands = mutableListOf<Command>()

    fun registerCommand(command: Command) {
        commands.add(command)
        log.info("Registered command '${command.getNames().firstOrNull()}'")
    }

    fun getCommands(): List<Command> {
        return commands
    }
}