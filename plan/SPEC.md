# GAME.md Format

GAME.md is a self-contained, plain-text representation of a game design. It gives AI agents and developers a persistent, complete understanding of a game — from rules and entities to design intent and content guidelines — so that decisions stay consistent across sessions and tools.

A GAME.md file has two parts: **YAML front matter** (machine-readable game structure) and a **Markdown body** (human-readable rationale and guardrails). The YAML holds normative mechanics, entities, and goals; the prose explains *why* those choices exist and how to extend or avoid breaking the game.

The front matter block must begin with a line containing exactly `---` and end with a line containing exactly `---`.

```
---
identity: ...
components: ...
entities: ...
mechanics: ...
goals: ...
---

## Design Pillars
## Mechanics in Depth
## Content Guidelines
## Anti-Patterns
```

---

## Schema

### `identity`

```yaml
identity:
  name: <string>
  genre: <string[]>          # 자유 태그 목록. 예: [casual, turn-based]
  platform: <string[]>       # 예: [mobile-ios, mobile-android, web]
  players: <int | "N-M">     # 단일 정수 또는 범위 문자열. "2+" 형식 금지
  pitch: <string>            # 정확히 한 문장. 모든 판단의 기준점
```

- `pitch`는 YAML에서 가장 중요한 필드다. AI는 스펙에 명시되지 않은 상황에서 `pitch`를 기준으로 판단한다.
- `players`는 정수(`1`, `2`) 또는 범위 문자열(`"1-4"`). 개방형 `"2+"` 는 **지원하지 않는다**.

### `components`

재사용 가능한 속성 묶음. 한 번 정의하고 여러 entity에서 참조한다.

```yaml
components:
  <component-name>:
    <field-name>:
      type: int | float | string | bool | enum | vec2 | list | ref
      range: [<min>, <max>]   # 숫자 타입 전용, 양 끝 포함
      values: []              # enum 타입 전용
      items: <entity-name>    # list 타입 전용
      default: <value>        # 게임 시작 시 초기값
    states: []                # 이 컴포넌트가 라이프사이클을 주도할 때만
```

### `entities`

게임 안의 모든 독립 객체. ECS 방식으로 components를 나열하거나, 공유 동작이 없는 단순 객체는 inline attributes 사용.

```yaml
entities:
  <entity-name>:
    components: [<component-name>, ...]
    states: [<state>, ...]
    count: <int>              # 고정 수량일 때만 선언
  # 단순 객체 단축형:
  <entity-name>:
    attributes:
      <field-name>: <type>
```

### `mechanics`

게임에서 일어날 수 있는 모든 것.

```yaml
mechanics:
  turn_structure: realtime | turn-based | phase-based

  actions:
    <action-name>:
      actor: <entity-name>
      params:
        <param-name>: <type 또는 enum(a|b|c)>
      preconditions:
        - "읽을 수 있는 의사코드 가드"
      effects:
        - "읽을 수 있는 의사코드 결과"

  loops:
    - name: <string>
      description: "무엇이 반복되고 왜 반복되는가"
```

**actions는 완전한 목록이어야 한다.** Consumer는 여기에 없는 action을 유효하지 않은 것으로 처리한다. 단, Markdown body에서 명시적으로 허용한 경우 예외.

`preconditions`와 `effects`는 어떤 프로그래밍 언어로도 문법적으로 유효할 필요가 없다. 구현 가능할 만큼 정확하면 된다.

### `goals`

세션 또는 매치가 끝나는 방법.

```yaml
goals:
  win:
    - condition: "plain English"
  loss:
    - condition: "plain English"
  draw:                        # 무승부가 없는 게임은 이 섹션 전체 생략
    - condition: "plain English"
  score:                       # 점수가 없는 게임은 이 섹션 전체 생략
    - metric: <metric-name>
      formula: "plain English 또는 산술식"
```

`win` / `loss` 아래 여러 항목 = 서로 다른 경로. 우선순위가 아니다.

---

## Sections (Markdown Body)

모든 GAME.md body는 front matter 닫힘 직후 **동일한 고정 산문 제목 4개**를 사용한다. Agent는 탐색을 위해 이 이름들에 의존할 수 있다.

### 섹션 순서 (변경 불가)

1. **Design Pillars**
2. **Mechanics in Depth**
3. **Content Guidelines**
4. **Anti-Patterns**

추가 `##` 섹션은 `Anti-Patterns` 뒤에만 붙일 수 있다.

### `## Design Pillars`

2~4개의 명명된 원칙. 게임이 어떤 *느낌*이어야 하는지 정의한다.

**형식:** `**이름** — 한 문장.` 하나당 한 줄.

Agent는 YAML만으로 결정이 안 될 때 Pillars를 타이브레이커로 사용한다.

```markdown
**Tension over comfort** — Every room should feel like it could kill you.
**Meaningful choice** — No action should be obviously correct.
```

### `## Mechanics in Depth`

YAML mechanics가 어떻게 상호작용하는지, 엣지 케이스, 특정 수치나 구조적 선택의 *이유*. 규칙 뒤의 **왜**.

### `## Content Guidelines`

새 콘텐츠(적, 카드, 레벨, 아이템 등)를 게임 모델에 맞게 추가하는 방법. Agent는 콘텐츠를 생성하거나 리팩토링하기 전에 이 섹션을 읽는다.

### `## Anti-Patterns`

게임 느낌을 깨거나 Pillar를 위반하는 것들. Agent가 알려진 실수를 재도입하지 않도록 방지한다.

---

## Consumer Behavior — 알 수 없는 콘텐츠 처리

| 상황 | 동작 | 예시 |
|---|---|---|
| `identity`, `components`, `entities`, `mechanics`, `goals` 하위 알 수 없는 최상위 키 | 구현 정책에 따라 보존 또는 경고; 정책 없이 무시 금지 | 추가 `meta:` 블록 |
| 4개 고정 섹션 뒤의 추가 `##` 섹션 | 보존; 프로젝트 문서에서 달리 명시하지 않는 한 비규범적으로 처리 | `## Lore Appendix` |
| 고정 섹션 사이에 삽입된 알 수 없는 `##` (섹션 순서 벗어남) | 경고 권장 | 두 번째와 세 번째 고정 섹션 사이의 `## Notes` |
| `mechanics.actions`에 없는 action | Markdown body에서 명시적으로 허용하지 않는 한 유효하지 않은 것으로 처리 | 선언되지 않은 `teleport` |
| `"2+"` 같은 개방형 `players` | 거부 또는 정규화; 스펙에 없음 | `"2+"` |

---

## Complete Annotated Template

```yaml
---
identity:
  name: ""
  genre: []
  platform: []
  players: 1
  pitch: ""

components:
  # 타입 필드 / states를 가진 재사용 가능한 번들

entities:
  # entity-name: { components: [...], states: [...], count: N }

mechanics:
  turn_structure: realtime   # realtime | turn-based | phase-based

  actions:
    # action-name:
    #   actor: entity-name
    #   params: {}
    #   preconditions: []
    #   effects: []

  loops:
    # - name: ""
    #   description: ""

goals:
  win:
    - condition: ""
  loss:
    - condition: ""
  # draw:
  #   - condition: ""
  # score:
  #   - metric: ""
  #     formula: ""
---

## Design Pillars

**Pillar name** — One sentence.

## Mechanics in Depth

## Content Guidelines

## Anti-Patterns
```
