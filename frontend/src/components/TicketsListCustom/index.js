import React, { useState, useEffect, useReducer, useContext } from "react";

import { makeStyles } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import Paper from "@material-ui/core/Paper";

import TicketListItem from "../TicketListItemCustom";
import TicketsListSkeleton from "../TicketsListSkeleton";

import useTickets from "../../hooks/useTickets";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import { SocketContext } from "../../context/Socket/SocketContext";

const useStyles = makeStyles((theme) => ({
  ticketsListWrapper: {
    position: "relative",
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflow: "hidden",
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  ticketsList: {
    flex: 1,
    maxHeight: "100%",
    overflowY: "scroll",
    ...theme.scrollbarStyles,
    borderTop: "2px solid rgba(0, 0, 0, 0.12)",
  },
  noTicketsText: {
    textAlign: "center",
    color: "rgb(104, 121, 146)",
    fontSize: "14px",
    lineHeight: "1.4",
  },
  noTicketsTitle: {
    textAlign: "center",
    fontSize: "16px",
    fontWeight: "600",
    margin: "0px",
  },
  noTicketsDiv: {
    display: "flex",
    height: "100px",
    margin: 40,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
}));

const reducer = (state, action) => {
  switch (action.type) {
    case "LOAD_TICKETS": {
      const newTickets = action.payload;
      newTickets.forEach((ticket) => {
        const ticketIndex = state.findIndex((t) => t.id === ticket.id);
        if (ticketIndex !== -1) {
          state[ticketIndex] = ticket;
          if (ticket.unreadMessages > 0) {
            state.unshift(state.splice(ticketIndex, 1)[0]);
          }
        } else {
          state.push(ticket);
        }
      });
      return [...state];
    }
    case "RESET_UNREAD": {
      const ticketIndex = state.findIndex((t) => t.id === action.payload);
      if (ticketIndex !== -1) {
        state[ticketIndex].unreadMessages = 0;
      }
      return [...state];
    }
    case "UPDATE_TICKET": {
      const ticket = action.payload;
      const ticketIndex = state.findIndex((t) => t.id === ticket.id);
      if (ticketIndex !== -1) {
        state[ticketIndex] = ticket;
      } else {
        state.unshift(ticket);
      }
      return [...state];
    }
    case "UPDATE_TICKET_UNREAD_MESSAGES": {
      const ticket = action.payload;
      const ticketIndex = state.findIndex((t) => t.id === ticket.id);
      if (ticketIndex !== -1) {
        state[ticketIndex] = ticket;
        state.unshift(state.splice(ticketIndex, 1)[0]);
      } else {
        state.unshift(ticket);
      }
      return [...state];
    }
    case "UPDATE_TICKET_CONTACT": {
      const contact = action.payload;
      const ticketIndex = state.findIndex((t) => t.contactId === contact.id);
      if (ticketIndex !== -1) {
        state[ticketIndex].contact = contact;
      }
      return [...state];
    }
    case "UPDATE_TICKET_PRESENCE": {
      const data = action.payload;
      const ticketIndex = state.findIndex((t) => t.id === data.ticketId);
      if (ticketIndex !== -1) {
        state[ticketIndex].presence = data.presence;
      }
      return [...state];
    }
    case "DELETE_TICKET": {
      return state.filter((t) => t.id !== action.payload);
    }
    case "RESET":
      return [];
    default:
      return state;
  }
};

const TicketsListCustom = (props) => {
  const { status, searchParam, tags, users, showAll, selectedQueueIds, updateCount, style } = props;
  const classes = useStyles();
  const [pageNumber, setPageNumber] = useState(1);
  const [ticketsList, dispatch] = useReducer(reducer, []);
  const { user } = useContext(AuthContext);
  const { profile, queues, allTicket } = user;
  const socketManager = useContext(SocketContext);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [status, searchParam, dispatch, showAll, tags, users, selectedQueueIds]);

  const queueIdsWithNull = [...selectedQueueIds];
  if (allTicket === "enabled" && !queueIdsWithNull.includes(null)) {
    queueIdsWithNull.push(null);
  }

  const { tickets, hasMore, loading } = useTickets({
    pageNumber,
    searchParam,
    status,
    showAll,
    tags: JSON.stringify(tags),
    users: JSON.stringify(users),
    queueIds: JSON.stringify(queueIdsWithNull),
  });

  useEffect(() => {
    const queueIds = queues.map((q) => q.id);
    const userWhatsappIds = Array.isArray(user.whatsappId)
      ? user.whatsappId.map(id => String(id))
      : [String(user.whatsappId)];

    const filteredTickets = tickets.filter((t) => {
      const ticketWhatsappId = String(t.whatsappId);
      const hasWhatsappPermission = t.whatsappId != null && userWhatsappIds.includes(ticketWhatsappId);
      const belongsToQueue = t.queueId !== null && queueIds.includes(t.queueId);
      const isAssignedToUser = t.userId === user.id;
      const isUnassigned = t.userId === null;
      const isNoQueue = t.queueId === null && allTicket === "enabled";
      const canAccess = isAssignedToUser || isUnassigned;

      return canAccess && (belongsToQueue || isNoQueue || hasWhatsappPermission);
    });

    if (profile === "admin") {
      dispatch({ type: "LOAD_TICKETS", payload: tickets }); // Solo admin ve todos
    } else {
      dispatch({ type: "LOAD_TICKETS", payload: filteredTickets }); // Todos los demás, filtrado
    }
  }, [tickets, status, searchParam, queues, profile, user.id, user.whatsappId, allTicket]);

  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    const socket = socketManager.getSocket(companyId);

    const userWhatsappIds = Array.isArray(user.whatsappId)
      ? user.whatsappId.map(id => String(id))
      : [String(user.whatsappId)];

    const shouldUpdateTicket = (ticket) => {
      if (!ticket) return false;
      if (profile === "admin" || showAll) return true;

      const ticketWhatsappId = String(ticket.whatsappId);
      const hasWhatsappPermission = ticket.whatsappId != null && userWhatsappIds.includes(ticketWhatsappId);
      const belongsToQueue = ticket.queueId !== null && selectedQueueIds.includes(ticket.queueId);
      const isAssignedToUser = ticket.userId === user.id;
      const isUnassigned = ticket.userId === null;
      const isNoQueue = ticket.queueId === null && allTicket === "enabled";

      const canAccess = isAssignedToUser || isUnassigned;

      return canAccess && (belongsToQueue || isNoQueue || hasWhatsappPermission);
    };

    socket.on("ready", () => {
      socket.emit(status ? "joinTickets" : "joinNotification", status);
    });

    socket.on(`company-${companyId}-ticket`, (data) => {
      if (!data) return;

      if (data.action === "updateUnread" && data.ticketId) {
        dispatch({ type: "RESET_UNREAD", payload: data.ticketId });
      }

      if (data.action === "update" && shouldUpdateTicket(data.ticket) && data.ticket.status === status) {
        dispatch({ type: "UPDATE_TICKET", payload: data.ticket });
      }

      if (data.action === "delete" && data.ticketId) {
        dispatch({ type: "DELETE_TICKET", payload: data.ticketId });
      }
    });
    socket.on(`company-${companyId}-appMessage`, (data) => {
      //console.log("📥 Mensaje recibido por socket:", data);
      const ticket = data?.ticket;
      if (!ticket || !ticket.whatsappId) return;

      const ticketWhatsappId = String(ticket.whatsappId);
      const hasWhatsappPermission = userWhatsappIds.includes(ticketWhatsappId);
      const belongsToQueue = ticket.queueId !== null && selectedQueueIds.includes(ticket.queueId);
      const isAssignedToUser = ticket.userId === user.id;
      const isNoQueue = ticket.queueId === null && allTicket === "enabled";

      const canSee = profile === "admin" || showAll || isAssignedToUser || belongsToQueue || isNoQueue || hasWhatsappPermission;
      if (!canSee) return;

      if (data.action === "create" && (status === undefined || ticket.status === status)) {
        const canAccess =
          profile === "admin" ||
          showAll ||
          ticket.userId === user.id ||
          (ticket.userId === null && (
            (ticket.queueId === null && allTicket === "enabled") ||
            selectedQueueIds.includes(ticket.queueId)
          )) ||
          userWhatsappIds.includes(String(ticket.whatsappId));

        if (!canAccess) return;

        dispatch({ type: "UPDATE_TICKET_UNREAD_MESSAGES", payload: ticket });
      }
    });

    socket.on(`company-${companyId}-presence`, (data) => {
      if (data?.ticketId) {
        dispatch({ type: "UPDATE_TICKET_PRESENCE", payload: data });
      }
    });

    socket.on(`company-${companyId}-contact`, (data) => {
      if (data?.action === "update" && data.contact) {
        dispatch({ type: "UPDATE_TICKET_CONTACT", payload: data.contact });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [status, showAll, user.id, user.whatsappId, selectedQueueIds, tags, users, profile, queues, socketManager, allTicket]);

  useEffect(() => {
    const count = ticketsList.filter((ticket) => !ticket.isGroup).length;
    if (typeof updateCount === "function") {
      updateCount(count);
    }
  }, [ticketsList, updateCount]);

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  return (
    <Paper className={classes.ticketsListWrapper} style={style}>
      <Paper square name="closed" elevation={0} className={classes.ticketsList} onScroll={handleScroll}>
        <List style={{ paddingTop: 0, paddingRight: 2 }}>
          {ticketsList.length === 0 && !loading ? (
            <div className={classes.noTicketsDiv}>
              <span className={classes.noTicketsTitle}>{i18n.t("ticketsList.noTicketsTitle")}</span>
              <p className={classes.noTicketsText}>{i18n.t("ticketsList.noTicketsMessage")}</p>
            </div>
          ) : (
            ticketsList
              .filter((ticket) => ticket.isGroup.toString() === "false")
              .map((ticket) => <TicketListItem ticket={ticket} key={ticket.id} />)
          )}
          {loading && <TicketsListSkeleton />}
        </List>
      </Paper>
    </Paper>
  );
};

export default TicketsListCustom;
