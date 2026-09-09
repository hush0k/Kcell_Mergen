export function NumberInformationLoadingOverlay({ visible }: { visible: boolean }) {
    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-4 bg-mg-surface rounded-3xl px-10 py-8 shadow-xl">
                <div className="w-12 h-12 border-4 border-mg-purple-soft border-t-mg-purple rounded-full animate-spin" />
                <p className="text-mg-text font-semibold">Формируем данные...</p>
                <p className="text-mg-text-2 text-sm">Обычно занимает 2-3 секунды</p>
            </div>
        </div>
    );
}