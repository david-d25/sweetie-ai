package space.davids_digital.sweetie.orm.entity

import jakarta.persistence.*

@Entity
@Table(
    name = "vk_sticker_packs",
    indexes = [
        Index(
            name = "vk_sticker_packs__enabled_index",
            columnList = "enabled"
        ),
        Index (
            name = "vk_sticker_packs__first_sticker_id_index",
            columnList = "first_sticker_id"
        ),
        Index(
            name = "vk_sticker_packs__product_id_index",
            columnList = "product_id"
        ),
    ]
)
class VkStickerPackEntity {
    @Id
    @Column(name = "id")
    var id: Int = 0

    @Column(name = "product_id")
    var productId: Long = 0

    @Column(name = "name", columnDefinition = "text")
    var name: String = ""

    @Column(name = "description", columnDefinition = "text")
    var description: String? = null

    @Column(name = "first_sticker_id")
    var firstStickerId: Int = 0

    @Column(name = "sticker_count")
    var stickerCount: Int = 0

    @Column(name = "enabled")
    var enabled: Boolean = false
}