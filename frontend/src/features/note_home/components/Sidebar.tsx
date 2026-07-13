import { Avatar } from "@/components/Avatar";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "@/api/resources";
import { MdOutlineWorkspaces } from "react-icons/md";
import { SiGraphql } from "react-icons/si";
import { LiSidebar } from "@/features/home/components/LiSidebar";
import { Button } from "@/components/Button";
import { LuPlus, LuFolderClosed, LuFolderOpen } from "react-icons/lu";
import { DirectoryListResponse, CurrentUser, DirectoryWithFilesResponse } from "@/types/api";
import { FaRegFile } from "react-icons/fa6";
import { NewFolderPopup } from "@/features/note_home/components/NewFolderPopup";
import { RiFunctionAddFill } from "react-icons/ri";
import { RiEdit2Fill } from "react-icons/ri";
import { TbCircleLetterMFilled } from "react-icons/tb";
import { useNoteSelection } from "@/contexts/NoteSelectionContext";


const pages = [
    { icon: <MdOutlineWorkspaces size={16}/>, name: "Рабочее место", link: "workspace" },
    { icon: <SiGraphql size={16}/>, name: "Граф знаний", link: "graph" },
]

const SELECTED_FOLDER_KEY = "note-selected-folder-id";

export function Sidebar() {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const [me, setMe] = useState<CurrentUser | null>(null);
    const [folders, setFolders] = useState<DirectoryListResponse | null>(null);
    const [selectedFolderId, setSelectedFolderId] = useState<number | null>(() => {
        try {
            const raw = localStorage.getItem(SELECTED_FOLDER_KEY);
            return raw ? Number(raw) : null;
        } catch {
            return null;
        }
    });
    const [selectedFolder, setSelectedFolder] = useState<DirectoryWithFilesResponse | null>(null);
    const { selectedFileId, setSelectedFileId } = useNoteSelection();
    const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);

    const fetchFolders = () => {
        api.directory.list().then((data) => setFolders(data)).catch(console.error);
    };

    const fetchSelectedFolder = (folderId: number) => {
        api.directory.getWithFiles(folderId).then((data) => setSelectedFolder(data)).catch(console.error);
    };

    const handleFolderClick = (folderId: number) => {
        if (selectedFolderId === folderId) {
            setSelectedFolderId(null);
            setSelectedFolder(null);
        } else {
            setSelectedFolder(null);
            setSelectedFolderId(folderId);
        }
    };

    const handleCreateFile = async (folderId: number) => {
        try {
            await api.meNote.create({
                directory_id: folderId,
                name: "Новый файл",
                content: { type: "doc", content: [] },
                tags: [],
            });
            if (selectedFolderId === folderId) {
                fetchSelectedFolder(folderId);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchFolders();
    }, []);

    useEffect(() => {
        if (selectedFolderId == null) {
            localStorage.removeItem(SELECTED_FOLDER_KEY);
            return;
        }

        localStorage.setItem(SELECTED_FOLDER_KEY, String(selectedFolderId));

        let cancelled = false;
        api.directory.getWithFiles(selectedFolderId).then((data) => {
            if (!cancelled) setSelectedFolder(data);
        }).catch((err) => {
            if (!cancelled) console.error(err);
        });
        return () => { cancelled = true; };
    }, [selectedFolderId]);

    useEffect(() => {
        let cancelled = false;
        api.auth.me().then((data) => {
            if (!cancelled) setMe(data);
        }).catch((err) => {
            if (!cancelled) console.error(err);
        });
        return () => { cancelled = true; };
    }, []);

    return (
        <div className="flex flex-col justify-betweenw w-[20rem] border-r border-nt-outline-variant bg-nt-surface-container-low">
            <div className={"flex flex-col justify-between h-full pb-5 items-center bg-mg-surface w-full bg-nt-surface-container-low"}>
                <div className={"flex flex-col space-y-6 items-center bg-mg-surface w-full bg-nt-surface-container-low"}>
                    <div className={"flex flex-row w-full space-x-2 px-4 py-2 border-b border-nt-outline-variant bg-nt-surface-container-low"}>
                        <Avatar firstName={me?.first_name} lastName={me?.last_name}/>
                        <div className={"flex flex-col space-y-0.5"}>
                            <p className={"inline font-bold text-nt-primary whitespace-nowrap"}>{me?.last_name} {me?.first_name}</p>
                            <p className={"font-medium"}>{me?.role}</p>
                        </div>
                    </div>

                    <div className={"w-full"}>
                        {pages.map((page) => (
                            <LiSidebar
                                key={page.link}
                                name={page.name}
                                icon={page.icon}
                                isOpen={pathname === `/${page.link}`}
                                onClick={() => navigate(`/${page.link}`)}
                                className={`py-3 text-nt-on-surface-variant font-normal hover:bg-nt-surface-dim ${pathname === `/${page.link}` ? "bg-nt-secondary-fixed" : ""}`}
                                indicatorClassName={"-my-[0.7rem] rounded-r-none"}
                            />
                        ))}
                    </div>

                    <Button
                        icon={<LuPlus />}
                        text={"Новая Папка"}
                        className={"w-auto rounded-none bg-nt-secondary-fixed-dim px-14 py-2"}
                        onClick={() => setIsNewFolderOpen(true)}
                    />

                    <div className={"flex flex-col space-y-1 w-full pl-5 pb-10 h-[40rem] overflow-y-auto [mask-image:linear-gradient(to_bottom,black_90%,transparent_100%)]"}>
                        <h3 className={"uppercase font-bold text-mg-text-2"}>Папки</h3>
                        {folders?.list.map((folder) => (
                            <div key={folder.id} className={"flex flex-col w-full text-lg"}>
                                <div
                                    className={`group flex flex-row items-center justify-between w-full whitespace-nowrap hover:text-mg-purple cursor-pointer ${selectedFolderId === folder.id ? "text-mg-purple font-semibold" : ""}`}
                                    onClick={() => handleFolderClick(folder.id)}
                                >
                                    <div className={"flex flex-row space-x-2 items-center min-w-0 flex-1"}>
                                        <p className={"shrink-0"}>{selectedFolderId === folder.id ? <LuFolderOpen /> : <LuFolderClosed />}</p>
                                        <p className={`truncate flex-1 ${
                                            selectedFolderId === folder.id
                                                ? "[mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent_100%)]"
                                                : "group-hover:[mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent_100%)]"
                                        }`}>
                                            {folder.name}
                                        </p>
                                    </div>

                                    <Button
                                        variant={"ghost"}
                                        icon={<RiFunctionAddFill />}
                                        className={`text-mg-text shrink-0 transition-opacity ${
                                            selectedFolderId === folder.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                        }`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCreateFile(folder.id);
                                        }}
                                    />
                                </div>

                                <div className={"flex flex-col space-y-1 border-l-2 border-mg-text-3 pl-4 ml-6"}>
                                    {selectedFolderId === folder.id && selectedFolder ? (
                                        <div>
                                            {selectedFolder.files.map((file) => (
                                                <div
                                                    className={`flex flex-row items-center cursor-pointer space-x-2 hover:text-mg-lime font-normal ${selectedFileId === file.id ? "text-mg-lime" : "text-mg-text"}`}
                                                    key={file.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedFileId(file.id);
                                                    }}
                                                >
                                                    <p><FaRegFile /></p>
                                                    <p>{file.name}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
                <div className={"flex flex-row items-center justify-between w-full px-5"}>
                    <Button
                        icon={<TbCircleLetterMFilled />}
                        text={"Mergen"}
                        className={"w-auto rounded-none"}
                        size={"sm"}
                        onClick={() => navigate("/home")}
                    />
                    <Button
                        icon={<RiEdit2Fill />}
                        text={"Редактировать"}
                        className={"w-auto rounded-none bg-mg-lime"}
                        size={"sm"}
                    />
                </div>
            </div>

            {isNewFolderOpen && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    onClick={() => setIsNewFolderOpen(false)}
                >
                    <div onClick={(e) => e.stopPropagation()}>
                        <NewFolderPopup onClose={() => setIsNewFolderOpen(false)} onCreated={fetchFolders} />
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}