package space.davids_digital.sweetie.orm.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.IdClass
import jakarta.persistence.Table

@Entity
@IdClass(VkStickerImageEntityId::class)
@Table(name = "vk_sticker_images")
class VkStickerImageEntity {
    @Id
    @Column(name = "sticker_id")
    var stickerId: Int = 0

    @Id
    @Column(name = "size")
    var size: Int = 0

    @Id
    @Column(name = "with_background")
    var withBackground: Boolean = false

    @Column(name = "image")
    var image: ByteArray = byteArrayOf()
}