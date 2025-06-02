import React, { useEffect, useReducer, useState, useContext } from "react";
import {
  Button,
  IconButton,
  makeStyles,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@material-ui/core";
import { DeleteOutline, Edit } from "@material-ui/icons";
import { toast } from "react-toastify";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import Title from "../../components/Title";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import QueueModal from "../../components/QueueModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import { SocketContext } from "../../context/Socket/SocketContext";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
  customTableCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  rowGray: {
    backgroundColor: "#f5f5f5",
  },
}));

const reducer = (state, action) => {
  switch (action.type) {
    case "LOAD_QUEUES":
      const newQueues = [];
      action.payload.forEach((queue) => {
        const index = state.findIndex((q) => q.id === queue.id);
        if (index !== -1) {
          state[index] = queue;
        } else {
          newQueues.push(queue);
        }
      });
      return [...state, ...newQueues];

    case "UPDATE_QUEUES":
      const queue = action.payload;
      const queueIndex = state.findIndex((q) => q.id === queue.id);
      if (queueIndex !== -1) {
        state[queueIndex] = queue;
        return [...state];
      } else {
        return [queue, ...state];
      }

    case "DELETE_QUEUE":
      return state.filter((q) => q.id !== action.payload);

    case "RESET":
      return [];

    default:
      return state;
  }
};

const Queues = () => {
  const classes = useStyles();

  const [queues, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(false);
  const [queueModalOpen, setQueueModalOpen] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const socketManager = useContext(SocketContext);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/queue");
        dispatch({ type: "LOAD_QUEUES", payload: data });
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    const socket = socketManager.getSocket(companyId);

    socket.on(`company-${companyId}-queue`, (data) => {
      if (["create", "update"].includes(data.action)) {
        dispatch({ type: "UPDATE_QUEUES", payload: data.queue });
      }
      if (data.action === "delete") {
        dispatch({ type: "DELETE_QUEUE", payload: data.queueId });
      }
    });

    return () => socket.disconnect();
  }, [socketManager]);

  const handleOpenQueueModal = () => {
    setQueueModalOpen(true);
    setSelectedQueue(null);
  };

  const handleCloseQueueModal = () => {
    setQueueModalOpen(false);
    setSelectedQueue(null);
  };

  const handleEditQueue = (queue) => {
    setSelectedQueue(queue);
    setQueueModalOpen(true);
  };

  const handleCloseConfirmationModal = () => {
    setConfirmModalOpen(false);
    setSelectedQueue(null);
  };

  const handleDeleteQueue = async (queueId) => {
    try {
      await api.delete(`/queue/${queueId}`);
      toast.success(i18n.t("¡Fila eliminada con éxito!"));
    } catch (err) {
      toastError(err);
    }
    setSelectedQueue(null);
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          selectedQueue &&
          `${i18n.t("queues.confirmationModal.deleteTitle")} ${selectedQueue.name}?`
        }
        open={confirmModalOpen}
        onClose={handleCloseConfirmationModal}
        onConfirm={() => handleDeleteQueue(selectedQueue.id)}
      >
        {i18n.t("queues.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      <QueueModal
        open={queueModalOpen}
        onClose={handleCloseQueueModal}
        queueId={selectedQueue?.id}
      />

      <MainHeader>
        <Title>{i18n.t("queues.title")}</Title>
        <MainHeaderButtonsWrapper>
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenQueueModal}
            style={{ borderRadius: 20, padding: "6px 16px", fontWeight: "bold" }}
          >
            {i18n.t("queues.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>

      <Paper className={classes.mainPaper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">
                <strong>{i18n.t("queues.table.name")}</strong>
              </TableCell>
              <TableCell align="center">
                <strong>{i18n.t("queues.table.color")}</strong>
              </TableCell>
              <TableCell align="center">
                <strong>{i18n.t("queues.table.greeting")}</strong>
              </TableCell>
              <TableCell align="center">
                <strong>{i18n.t("queues.table.actions")}</strong>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {queues.map((queue, index) => (
              <TableRow
                key={queue.id}
                className={index % 2 !== 0 ? classes.rowGray : undefined}
              >
                <TableCell align="center">{queue.name}</TableCell>

                <TableCell align="center">
                  <div style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%"
                  }}>
                    <span style={{
                      backgroundColor: queue.color,
                      width: 60,
                      height: 20,
                      display: "inline-block",
                      borderRadius: 2
                    }} />
                  </div>
                </TableCell>

                <TableCell align="center">
                  <Typography style={{ width: 300 }} noWrap variant="body2">
                    {queue.greetingMessage}
                  </Typography>
                </TableCell>

                <TableCell align="center">
                  <IconButton size="small" onClick={() => handleEditQueue(queue)}>
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedQueue(queue);
                      setConfirmModalOpen(true);
                    }}
                  >
                    <DeleteOutline />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {loading && <TableRowSkeleton columns={4} />}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Queues;
