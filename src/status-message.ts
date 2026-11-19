/** KR: 브라우저의 3D 제한을 읽기 쉬운 문장으로 알린다. EN: Present an actionable graphics fallback. */
export function viewerFailureMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : '';
    if (/WebGL|graphics context/i.test(message)) {
        return '이 브라우저에서 3D 화면을 열 수 없어요. 아래 스틸컷으로 먼저 둘러볼 수 있어요.';
    }
    return message || '3D 화면을 준비하지 못했어요. 다시 시도하거나 아래 스틸컷을 봐 주세요.';
}
