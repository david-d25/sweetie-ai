package space.davids_digital.sweetie.orm.repository

import org.springframework.data.jpa.repository.JpaRepository
import space.davids_digital.sweetie.orm.entity.VkAudioTranscriptEntity

interface VkAudioTranscriptRepository: JpaRepository<VkAudioTranscriptEntity, Int>