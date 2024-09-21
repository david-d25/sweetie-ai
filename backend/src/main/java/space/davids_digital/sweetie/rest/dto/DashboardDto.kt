package space.davids_digital.sweetie.rest.dto

data class DashboardDto(
    val user: UserDto,
    val chats: List<Chat>
) {
    data class Chat(
        val peerId: Long,
        val title: String,
        val pictureUrl: String,
        val botEnabled: Boolean
    )
}