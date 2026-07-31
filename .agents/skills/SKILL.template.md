# {SkillName}

统一 Skill 契约模板（对应设计 C2 契约完备属性）。

每个 Skill 必须包含 name、role、triggers、inputs、outputs、permissions 六字段。

## name

- 类型：string
- 说明：Skill 唯一标识，与目录名一致。

## role

- 类型：string
- 说明：绑定角色。取值：triage / architect / developer / reviewer / qa / retro。

## triggers

- 类型：string[]
- 说明：触发条件。每个条目描述一个可识别的触发场景。

## inputs

- 类型：string[]
- 说明：输入要求。列出执行本 Skill 所依赖的上下文与数据。

## outputs

- 类型：string[]
- 说明：产出制品。列出 Skill 完成后生成的工件与证据。

## permissions

- 类型：string[]
- 说明：权限与凭据范围。真实凭据一律为空，外部调用经 Higress 网关以 consumer token 转发。
