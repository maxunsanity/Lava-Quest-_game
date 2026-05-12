# 사용자 지적·피드백 로그

이 파일에 무엇을 남길지는 **사용자가 저장하라고 지시할 때만** 한다. 에이전트는 임의로 채우거나 자동 누적하지 않는다.

## 2026-05-11

- **실패 → 보상 UI**: 보상·정렬에서 `eliminationLevel: null` 고정으로 순위가 스펙과 어긋남. `playerRowsForRankingSort()`로 `GAME_lava_quest.md`와 동일한 필드 전달, 0클리어 탈락용 `meFailedAttemptLevel`·`atLevelWhenFailed` 추가. `ranking.js` 0클리어 탈락자 비교 시 `atLevelWhenFailed` 부호 수정(높은 실패 레벨이 상위). 실패 시 HUD는 `setPlayersHud`로 통일.

- **구동 불가**: `index.html`이 인라인 CSS·디버그 스크립트로 비대해져 표준 마크업으로 정리(게임 로직는 `src/main.js`·`style.css`만). `vite.config.js`에 `base: './'`·CSV `fetch`에 `import.meta.env.BASE_URL` 반영. `lavaScene.js`가 쓰는 `@tweenjs/tween.js`가 `package.json`에 없어 `npm run build`/번들이 깨지던 문제 → 의존성 추가.
