import { useState } from "react";
import { db, initDB } from "../../indexedDB";
import {
  DenormalizedRow,
  Loading,
  ToastNotification,
} from "carbon-components-react";
import IDataTable from "./DataTable";
import IModal from "./IModal";
import ImportModal from "./ImportModal";
import { useLiveQuery } from "dexie-react-hooks";
import { SortInfo } from "./useSortInfo";

const ImportPage = () => {
  const [open, setOpen] = useState<
    "import" | "add" | "edit" | "delete" | "editHeader" | ""
  >("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [targetId, setTargetId] = useState<number | number[]>(NaN);
  const [editData, setEditData] = useState<any>({});
  const [showNotification, setShowNotification] = useState<
    "success" | "error" | ""
  >("");
  const [queryParams, setQueryParams] = useState({
    page: 1,
    pageSize: 10,
    searchString: "",
    sortInfo: { columnId: "", direction: "NONE" },
  });
  const totalItemsLength = useLiveQuery(
    async () => {
      if (!db.isOpen()) return 0;
      return db.store.filter(searchText).count();
    },
    [queryParams.searchString],
    0
  );
  const data = useLiveQuery(
    async () => {
      if (!db.isOpen()) return [];
      const { page, pageSize, sortInfo } = queryParams;
      const record = (await db.store.get(1)) ?? {};
      const sortHeaderExists = Object.keys(record).includes(sortInfo.columnId);
      let sortedResults;
      if (!sortHeaderExists) {
        sortedResults = db.store;
      } else {
        sortedResults =
          sortInfo.direction === "ASC"
            ? db.store.orderBy(sortInfo.columnId)
            : sortInfo.direction === "DESC"
            ? db.store.orderBy(sortInfo.columnId).reverse()
            : db.store;
      }
      return sortedResults
        .filter(searchText)
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .toArray();
    },
    [queryParams],
    []
  );

  const searchText = (record: object) => {
    return (
      Object.values(record)
        .join()
        .toLowerCase()
        .indexOf(queryParams.searchString) >= 0
    );
  };

  const setQuery = (query: {
    page: number;
    pageSize: number;
    searchString: string;
    sortInfo: SortInfo;
  }) => {
    setQueryParams(query);
  };

  const closeModal = () => {
    setOpen("");
  };

  const openAddModal = () => {
    const temp: any = {};
    Object.keys(data[0])
      .filter((field) => field !== "id")
      .forEach((field) => {
        temp[field] = "";
      });
    setEditData(temp);
    setOpen("add");
  };

  const openEditModal = async (rowId: string) => {
    setTargetId(parseInt(rowId));
    setEditData(await db.store.get(parseInt(rowId)));
    setOpen("edit");
  };

  const openEditHeaderModal = () => {
    const temp: any = {};
    Object.keys(data[0])
      .filter((field) => field !== "id")
      .forEach((field) => {
        temp[field] = field;
      });
    setEditData(temp);
    setOpen("editHeader");
  };

  const openDeleteModal = (rowId: string) => {
    setTargetId(parseInt(rowId));
    setOpen("delete");
  };

  const openBatchDeleteModal = (selectedRows: readonly DenormalizedRow[]) => {
    setTargetId(selectedRows.map((row) => parseInt(row.id)));
    setOpen("delete");
  };

  const addRow = () => {
    closeModal();
    setIsLoading(true);
    db.store
      .add(editData)
      .then(() => {
        setIsLoading(false);
        setShowNotification("success");
      })
      .catch(() => {
        setIsLoading(false);
        setShowNotification("error");
      });
  };

  const editRow = () => {
    closeModal();
    setIsLoading(true);
    if (!Array.isArray(targetId)) {
      db.store
        .put(editData)
        .then(() => {
          setIsLoading(false);
          setShowNotification("success");
        })
        .catch(() => {
          setIsLoading(false);
          setShowNotification("error");
        });
    }
  };

  const editHeaders = async () => {
    closeModal();
    setIsLoading(true);
    const data = await db.store.toArray();
    db.store
      .bulkPut(data.map((d) => renameKeys(d, editData)))
      .then(() => {
        setIsLoading(false);
        setShowNotification("success");
      })
      .catch(() => {
        setIsLoading(false);
        setShowNotification("error");
      });
  };

  const deleteData = async () => {
    closeModal();
    setIsLoading(true);
    if (Array.isArray(targetId)) {
      db.store
        .bulkDelete(targetId)
        .then(() => {
          setIsLoading(false);
          setShowNotification("success");
        })
        .catch(() => {
          setIsLoading(false);
          setShowNotification("error");
        });
    } else {
      db.store
        .delete(targetId)
        .then(() => {
          setIsLoading(false);
          setShowNotification("success");
        })
        .catch(() => {
          setIsLoading(false);
          setShowNotification("error");
        });
    }
  };

  const removeDataset = async () => {
    setIsLoading(true);
    await initDB("++id");
    db.store
      .clear()
      .then(() => {
        setIsLoading(false);
        setShowNotification("success");
      })
      .catch(() => {
        setIsLoading(false);
        setShowNotification("error");
      });
  };

  const closeNotification = (
    _e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    setShowNotification("");
    return true;
  };

  const renameKeys = (obj: any, newKeys: any) => {
    const keyValues = Object.keys(obj).map((key) => {
      const newKey = newKeys[key] || key;
      return { [newKey]: obj[key] };
    });
    return Object.assign({}, ...keyValues);
  };

  return (
    <div
      style={{
        background: "rgb(224, 224, 224)",
        borderRadius: "1rem",
      }}
    >
      {showNotification === "success" || showNotification === "error" ? (
        <ToastNotification
          kind={showNotification}
          role="status"
          timeout={4000}
          title={
            showNotification === "success" ? "Success" : "An Error Occurred"
          }
          onClose={closeNotification}
        />
      ) : (
        <div style={{ height: 48 }}></div>
      )}
      {isLoading && <Loading />}
      <IDataTable
        data={data}
        totalItemsLength={totalItemsLength}
        setQuery={setQuery}
        onBatchDelete={openBatchDeleteModal}
        onAdd={openAddModal}
        removeDataset={removeDataset}
        onImport={() => setOpen("import")}
        onEditHeader={openEditHeaderModal}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
      />
      {open === "import" ? (
        <ImportModal
          closeModal={closeModal}
          setIsLoading={setIsLoading}
          setShowNotification={setShowNotification}
        />
      ) : open === "add" ? (
        <IModal
          header="Add Data"
          closeModal={closeModal}
          onConfirm={addRow}
          targetId={targetId as number}
          editData={editData}
          setEditData={setEditData}
        />
      ) : open === "edit" ? (
        <IModal
          header="Update Data"
          closeModal={closeModal}
          onConfirm={editRow}
          targetId={targetId as number}
          editData={editData}
          setEditData={setEditData}
        />
      ) : open === "editHeader" ? (
        <IModal
          header="Update Headers"
          closeModal={closeModal}
          onConfirm={editHeaders}
          targetId={targetId as number}
          editData={editData}
          setEditData={setEditData}
        />
      ) : open === "delete" ? (
        <IModal
          header="Are you sure you want to delete the selected row(s)?"
          closeModal={closeModal}
          onConfirm={deleteData}
          targetId={targetId}
          editData={editData}
          setEditData={setEditData}
          danger
        />
      ) : null}
    </div>
  );
};

export default ImportPage;
