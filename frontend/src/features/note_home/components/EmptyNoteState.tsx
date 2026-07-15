import { TbCircleLetterMFilled } from "react-icons/tb";


export function EmptyNoteState() {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full text-center px-6">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-mg-purple-soft text-mg-purple mb-6">
                <TbCircleLetterMFilled size={40} />
            </div>
            <h2 className="text-2xl font-bold text-mg-text mb-2">Файл не выбран</h2>
            <p className="text-mg-text-2 max-w-sm">
                Выберите заметку в боковой панели слева или создайте новую, чтобы начать работу
            </p>
        </div>
    );
}