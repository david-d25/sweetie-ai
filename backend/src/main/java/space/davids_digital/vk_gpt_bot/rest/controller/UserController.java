package space.davids_digital.vk_gpt_bot.rest.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;
import space.davids_digital.vk_gpt_bot.orm.service.UsagePlanOrmService;
import space.davids_digital.vk_gpt_bot.orm.service.UserOrmService;
import space.davids_digital.vk_gpt_bot.rest.dto.UserDto;
import space.davids_digital.vk_gpt_bot.rest.mapper.UsagePlanDtoMapper;
import space.davids_digital.vk_gpt_bot.service.SessionService;
import space.davids_digital.vk_gpt_bot.integration.vk.VkApiService;

@RestController
@RequestMapping("/user")
public class UserController {
    private final VkApiService vkApiService;
    private final SessionService sessionService;
    private final UsagePlanOrmService usagePlanOrmService;
    private final UsagePlanDtoMapper usagePlanDtoMapper;
    private final UserOrmService userOrmService;

    @Autowired
    public UserController(
            VkApiService vkApiService,
            SessionService sessionService,
            UsagePlanOrmService usagePlanOrmService,
            UsagePlanDtoMapper usagePlanDtoMapper,
            UserOrmService userOrmService
    ) {
        this.vkApiService = vkApiService;
        this.sessionService = sessionService;
        this.usagePlanOrmService = usagePlanOrmService;
        this.usagePlanDtoMapper = usagePlanDtoMapper;
        this.userOrmService = userOrmService;
    }

    @GetMapping
    @ResponseBody
    public UserDto getCurrentUser() {
        var session = sessionService.requireSession();
        var userVkId = session.userVkId();
        var user = userOrmService.getById(userVkId);
        var usagePlan = usagePlanOrmService.getOrDefault(user.usagePlanId(), "default");
        var vkUser = vkApiService.getUser(userVkId);

        return new UserDto(
                userVkId,
                vkUser.firstName,
                vkUser.lastName,
                user.credits(),
                vkUser.photo200,
                user.lastCreditGain(),
                usagePlanDtoMapper.modelToDto(usagePlan),
                user.usagePlanExpiry()
        );
    }
}
