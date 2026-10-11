/**
 * [TensorFlow.js 모델 저장 및 이어서 학습 관리 유틸리티]
 * - IndexedDB를 이용해 브라우저에 AI 모델 가중치 저장 및 로드
 */

// 1. 모델 저장 함수
async function saveModelToIndexedDB(model, modelName) {
    try {
        await model.save(`indexeddb://${modelName}`);
        console.log(`[${modelName}] 모델이 브라우저 저장소에 성공적으로 저장되었습니다.`);
    } catch (err) {
        console.error(`[${modelName}] 모델 저장 실패:`, err);
    }
}

// 2. 저장된 모델 불러오기 (없으면 null 반환)
async function loadModelFromIndexedDB(modelName, compileConfig) {
    try {
        const model = await tf.loadLayersModel(`indexeddb://${modelName}`);
        if (compileConfig) {
            model.compile(compileConfig);
        }
        console.log(`[${modelName}] 저장된 모델을 불러와 이어서 학습을 준비합니다.`);
        return model;
    } catch (err) {
        console.log(`[${modelName}] 저장된 기존 모델이 없어 새로 생성합니다.`);
        return null;
    }
}