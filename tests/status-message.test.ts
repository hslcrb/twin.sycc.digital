import assert from 'node:assert/strict';
import test from 'node:test';
import { viewerFailureMessage } from '../src/status-message.ts';

test('shows a friendly WebGL error without dropping the existing guidance for other errors', () => {
    const message = viewerFailureMessage(new Error('THREE.WebGLRenderer: Error creating WebGL context.'));
    assert.match(message, /이 브라우저에서 3D 화면을 열 수 없어요/);
    assert.doesNotMatch(message, /THREE.WebGLRenderer/);
    assert.equal(viewerFailureMessage(new Error('모델 파일을 불러올 수 없습니다.')), '모델 파일을 불러올 수 없습니다.');
});
