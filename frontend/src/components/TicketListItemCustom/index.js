import React, { useContext, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { format, isSameDay, parseISO } from "date-fns";
import { useHistory, useParams } from "react-router-dom";
import Avatar from "@material-ui/core/Avatar";
import Badge from "@material-ui/core/Badge";
import Box from "@material-ui/core/Box";
import Divider from "@material-ui/core/Divider";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import ListItemText from "@material-ui/core/ListItemText";
import Typography from "@material-ui/core/Typography";
import { blue, green, grey, orange, red } from "@material-ui/core/colors";
import { makeStyles } from "@material-ui/core/styles";
import { i18n } from "../../translate/i18n";
import { Tooltip } from "@material-ui/core";
import { v4 as uuidv4 } from "uuid";
import VisibilityIcon from "@material-ui/icons/Visibility";
import { AuthContext } from "../../context/Auth/AuthContext";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import TicketMessagesDialog from "../TicketMessagesDialog";
import MarkdownWrapper from "../MarkdownWrapper";
import AndroidIcon from "@material-ui/icons/Android";
import CheckIcon from "@material-ui/icons/Check";
import CloseIcon from "@material-ui/icons/Close";
import ReplayIcon from "@material-ui/icons/Replay";
import TransferWithinAStationIcon from "@material-ui/icons/TransferWithinAStation";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import FaceIcon from "@material-ui/icons/Face";
import { getInitials } from "../../helpers/getInitials";
import { generateColor } from "../../helpers/colorGenerator";
import TransferTicketModal from "../TransferTicketModalCustom";
import { FaRegEye } from "react-icons/fa";
import Button from "@material-ui/core/Button";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
const iconContainerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "30px",
  height: "30px",
  borderRadius: "50%",
  position: "relative",
};
const useStyles = makeStyles((theme) => ({
  ticket: {
    position: "relative",
    height: 80,
    borderRadius: 20,
    marginTop: 3,
  },
  pendingTicket: {
    cursor: "unset",
  },
  queueTag: {
    background: "#FCFCFC",
    color: "#000",
    marginRight: 1,
    padding: 1,
    fontWeight: "bold",
    paddingLeft: 5,
    paddingRight: 5,
    borderRadius: 3,
    fontSize: "0.8em",
    whiteSpace: "nowrap",
  },
  noTicketsDiv: {
    display: "flex",
    height: "100px",
    margin: 40,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  newMessagesCount: {
    alignSelf: "center",
    marginRight: 8,
    marginLeft: "auto",
  },
  noTicketsText: {
    textAlign: "center",
    color: "rgb(104, 121, 146)",
    fontSize: "14px",
    lineHeight: "1.4",
  },
  connectionTag: {
    background: "green",
    color: "#FFF",
    marginRight: 1,
    padding: 1,
    fontWeight: "bold",
    paddingLeft: 5,
    paddingRight: 5,
    borderRadius: 3,
    fontSize: "0.8em",
    whiteSpace: "nowrap",
  },
  noTicketsTitle: {
    textAlign: "center",
    fontSize: "16px",
    fontWeight: "600",
    margin: "0px",
  },
  contactNameWrapper: {
    display: "flex",
    justifyContent: "space-between",
    marginLeft: "5px",
  },
  lastMessageTime: {
    justifySelf: "flex-end",
    textAlign: "right",
    position: "relative",
    top: -28,
    color: "#black",
    padding: 1,
    paddingLeft: 5,
    paddingRight: 10,
    fontSize: "1em",
  },
  closedBadge: {
    alignSelf: "center",
    justifySelf: "flex-end",
    marginRight: 32,
    marginLeft: "auto",
  },
  contactLastMessage: {
    paddingRight: "0%",
    marginLeft: "5px",
  },
  badgeStyle: {
    color: "white",
    backgroundColor: green[500],
    right: 20,
  },
  acceptButton: {
    position: "absolute",
    borderRadius: "15px",
    right: "108px",
  },
  ticketQueueColor: {
    flex: "none",
    width: "16px",
    height: "16px",
    position: "absolute",
    top: "60%",
    left: "3%",
    borderRadius: 10,
    borderStyle: "solid",
    borderColor: "white",
  },
  ticketInfo: {
    position: "relative",
    top: -13,
  },
  secondaryContentSecond: {
    display: "flex",
    alignItems: "flex-start",
    flexWrap: "wrap",
    flexDirection: "row",
    alignContent: "flex-start",
  },
  ticketInfo1: {
    position: "relative",
    top: 13,
    right: 0,
  },
  Radiusdot: {
    "& .MuiBadge-badge": {
      borderRadius: 2,
      position: "inherit",
      height: 16,
      margin: 2,
      padding: 3,
    },
    "& .MuiBadge-anchorOriginTopRightRectangle": {
      transform: "scale(1) translate(0%, -40%)",
    },
  },
  presence: {
    color: theme?.mode === "light" ? "blue" : "lightgreen",
    fontWeight: "bold",
  },
  customAcceptButton: {
    /*   backgroundColor: "#28a745", */
    color: "#fff",
    fontWeight: "bold",
    fontSize: "0.85rem",
    /*   padding: "4px 12px", */
    borderRadius: "16px",
    border: "none",
    cursor: "pointer",
    position: "absolute",
    right: "4%",
    "&:hover": {
      backgroundColor: "#005fa3",
    },
  },
  customAvatar: {
    width: 48,
    height: 48,
    fontSize: "1.4rem",
    border: "2px solid #007bdb", // ejemplo
  },
  botonAceptarEstiloImagen: {
    backgroundColor: "#0d6efd",
    color: "#fff",
    fontWeight: "bold",
    height: "100%",
    textTransform: "uppercase",
    padding: "6px 20px",
    borderRadius: "0px 8px 8px 0px",
    fontSize: "0.8rem",
    boxShadow: "0px 3px 6px rgba(0,0,0,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "&:hover": {
      backgroundColor: "#0b5ed7",
    },
  },
  botonCerrarEstiloImagen: {
    marginTop: 25,
    background: theme.palette.type === 'dark' ? '#9E9E9E' : '#e0e0e0',
    color: theme.palette.type === 'dark' ? '#000' : '#373a3c',
    fontWeight: "bold",
    textTransform: "uppercase",
    fontSize: "0.6rem",
    boxShadow: "0px 3px 6px rgba(0,0,0,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    "&:hover": {
      backgroundColor: "#F44336",
      color: "#fff",
    },
  }
}));
const TicketListItemCustom = ({ ticket }) => {
  const classes = useStyles();
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [ticketUser, setTicketUser] = useState(null);
  const [tag, setTag] = useState([]);
  const [whatsAppName, setWhatsAppName] = useState(null);
  const [lastInteractionLabel, setLastInteractionLabel] = useState("");
  const [openTicketMessageDialog, setOpenTicketMessageDialog] = useState(false);
  const { ticketId } = useParams();
  const isMounted = useRef(true);
  const { setCurrentTicket } = useContext(TicketsContext);
  const { user } = useContext(AuthContext);
  const { profile } = user;
  const [transferTicketModalOpen, setTransferTicketModalOpen] = useState(false);
  const presenceMessage = {
    composing: "Escribiendo...",
    recording: "Grabando audio...",
    paused: "Pausado",
    available: "En línea",
    unavailable: "Desconectado",
  };

  const truncateText = (text, maxLength) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };

  useEffect(() => {
    if (ticket.userId && ticket.user) {
      setTicketUser(ticket.user?.name);
    }
    setTag(ticket?.tags);

    return () => {
      isMounted.current = false;
    };
  }, [ticket]);

  const getTimeLabel = () => {
    if (!ticket.updatedAt) return "";
    const lastInteractionDate = parseISO(ticket.updatedAt);
    return isSameDay(lastInteractionDate, new Date())
      ? format(lastInteractionDate, "HH:mm")
      : format(lastInteractionDate, "dd/MM/yyyy");
  };

  const getInteractionTimeLabel = () => {
    if (!ticket.lastMessage) return null;

    const lastInteractionDate = parseISO(ticket.updatedAt);
    const currentDate = new Date();
    const timeDifference = currentDate - lastInteractionDate;
    const minutesDifference = Math.floor(timeDifference / (1000 * 60));
    const hoursDifference = Math.floor(timeDifference / (1000 * 60 * 60));

    if (minutesDifference < 3) return null;

    let labelText = "";
    let className = "";

    if (minutesDifference < 30) {
      labelText = `${minutesDifference}m`;
      className = "recent";
    } else if (hoursDifference < 24) {
      labelText = `${hoursDifference}h`;
      className = hoursDifference > 1 ? "warning" : "recent";
    } else {
      labelText = `${Math.floor(hoursDifference / 24)}d`;
      className = "critical";
    }

    return <span className={`${classes.interactionTime} ${className}`}>{labelText}</span>;
  };

  const handleCloseTicket = async (id) => {
    setLoading(true);
    try {
      await api.put(`/tickets/${id}`, {
        status: "closed",
        userId: null,
        queueId: null,
        /*         userId: user?.id,
                queueId: ticket?.queue?.id, */
      });
      history.push("/tickets/");
    } catch (err) {
      toastError(err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const handleReopenTicket = async (id) => {
    setLoading(true);
    try {
      await api.put(`/tickets/${id}`, {
        status: "open",
        userId: user?.id,
        queueId: ticket?.queue?.id,
      });
      history.push(`/tickets/${ticket.uuid}`);
    } catch (err) {
      toastError(err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const handleAcceptTicket = async (id) => {
    setLoading(true);
    try {
      await api.put(`/tickets/${id}`, {
        status: "open",
        userId: user?.id,
      });
      history.push(`/tickets/${ticket.uuid}`);
    } catch (err) {
      toastError(err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const handleTransferTicket = () => {
    setTransferTicketModalOpen(true);
  };

  const handleCloseTransferModal = () => {
    setTransferTicketModalOpen(false);
  };

  const handleSelectTicket = () => {
    if (ticket.status === "pending") return;
    const code = uuidv4();
    const { id, uuid } = ticket;
    setCurrentTicket({ id, uuid, code });
  };

  const channelInfo = ticket?.contact?.instagramId
    ? { label: "Instagram", color: "#d62976" } // color típico de Instagram
    : ticket?.contact?.messengerId
      ? { label: "Facebook", color: "#1877F2" } // azul Facebook
      : ticket?.contact?.number
        ? { label: "Whatsapp", color: "#25D366" } // verde WhatsApp
        : null;

  const renderTicketInfo = () => {
    switch (ticket.status) {
      case "closed":
        return (
          <Tooltip title="Reabrir">
            <ReplayIcon
              variant="contained"
              className={classes.actionIcon}
              size="small"
              loading={loading}
              style={{ color: blue[500] }}
              onClick={(e) => handleReopenTicket(ticket.id)}
            />
          </Tooltip>
        );
      default:
        return <></>;
    }
  };

  return (
    <>
      <TransferTicketModal
        modalOpen={transferTicketModalOpen}
        onClose={handleCloseTransferModal}
        ticketid={ticket.id}
      />

      <TicketMessagesDialog
        open={openTicketMessageDialog}
        onClose={() => setOpenTicketMessageDialog(false)}
        ticketId={ticket.id}
      />

      <ListItem
        button
        onClick={handleSelectTicket}
        selected={ticketId && +ticketId === ticket.id}
        className={clsx(classes.ticket, {
          [classes.pendingTicket]: ticket.status === "pending",
          [classes.selectedTicket]: ticketId && +ticketId === ticket.id,
        })}
      >
        <span
          style={{ backgroundColor: ticket.queue?.color || grey[500] }}
          className={classes.ticketQueueColor}
        />

        <ListItemAvatar>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Avatar src={ticket?.contact?.profilePicUrl} className={classes.customAvatar} />
            <Tooltip
              arrow
              placement="right"
              title={ticket.whatsapp?.name + " | " + (ticket.queue?.name || "Sin Dpto.")}
            >
              <span
                style={{
                  backgroundColor: ticket.queue?.color || "#7C7C7C",
                  marginLeft: 1,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  display: "inline-block",
                }}
                className={classes.ticketQueueColor}
              ></span>
            </Tooltip>
          </div>
        </ListItemAvatar>

        <ListItemText
          disableTypography
          primary={
            <span className={classes.contactNameWrapper}>
              <Typography noWrap component="span" variant="body2" color="textPrimary">
                {ticket.contact.name} {lastInteractionLabel}
              </Typography>
            </span>
          }
          secondary={
            <span className={classes.contactNameWrapper}>
              <Typography
                className={classes.contactLastMessage}
                noWrap
                component="span"
                variant="body2"
                color="textSecondary"
              >
                {["composing", "recording"].includes(ticket?.presence) ? (
                  <span className={classes.presence}>{presenceMessage[ticket.presence]}</span>
                ) : (
                  <>
                    {typeof ticket.lastMessage === "string" && ticket.lastMessage.includes("data:image/png;base64") ? (
                      <MarkdownWrapper>Localización</MarkdownWrapper>
                    ) : (
                      <MarkdownWrapper>{ticket.lastMessage}</MarkdownWrapper>
                    )}
                    <br />
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "3px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          backgroundColor: channelInfo.color,
                          color: "#fff",
                          fontSize: "0.60rem",
                          fontWeight: "bold",
                          borderRadius: "6px",
                          padding: "2px 6px",
                          textTransform: "uppercase",
                        }}
                      >
                        {channelInfo.label}
                      </span>
                      {ticket?.user?.name && (
                        <span
                          style={{
                            display: "inline-block",
                            backgroundColor: "rgb(93, 157, 230)",
                            color: "#fff",
                            fontSize: "0.60rem",
                            fontWeight: "bold",
                            borderRadius: "6px",
                            padding: "2px 6px",
                            textTransform: "uppercase",
                          }}
                        >
                          {ticket?.user?.name}
                        </span>
                      )}
                      {profile === "admin" && !ticket.isGroup && ticket.status === "pending" && (
                        <Tooltip title="Ver mensajes">
                          <button
                            onClick={() => setOpenTicketMessageDialog(true)}
                            style={{
                              border: "none",
                              background: "transparent",
                              padding: "2px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <FaRegEye size={20} color={ticket.queue?.color || grey[500]} />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </>
                )}
              </Typography>
            </span>
          }
        />
        <ListItemSecondaryAction style={{
          right: 0,
          top: 0,
          transform: "none",
          height: "100%",
          display: "flex",
          alignItems: "stretch"
        }}>
          <Box display="flex" alignItems="center" flexDirection="row" gap={1}>
            {/* Hora de último mensaje */}
            {ticket.lastMessage && (
              <Typography
                className={classes.lastMessageTime}
                component="span"
                variant="body2"
                color="textSecondary"
              >
                {isSameDay(parseISO(ticket.updatedAt), new Date())
                  ? format(parseISO(ticket.updatedAt), "HH:mm")
                  : format(parseISO(ticket.updatedAt), "dd/MM/yyyy")}
              </Typography>
            )}
            <Badge
              className={classes.newMessagesCount}
              badgeContent={ticket.unreadMessages}
              classes={{ badge: classes.badgeStyle }}
            />
            {ticket.status === "pending" && ticket.isGroup && (
              <ButtonWithSpinner
                variant="contained"
                className={classes.groupsButton}
                size="small"
                loading={loading}
                onClick={() => handleAcceptTicket(ticket.id)}
              >
                GRUPO
              </ButtonWithSpinner>
            )}

            {ticket.status === "attending" && (
              <>
                <ButtonWithSpinner
                  style={{
                    backgroundColor: "green",
                    color: "white",
                    padding: "0px",
                    borderRadius: "0px",
                    fontSize: "0.6rem",
                  }}
                  variant="contained"
                  className={classes.acceptButton}
                  size="small"
                  loading={loading}
                  onClick={() => handleAcceptTicket(ticket.id)}
                >
                  {i18n.t("ticketsList.buttons.accept")}
                </ButtonWithSpinner>

                <ButtonWithSpinner
                  style={{
                    backgroundColor: "red",
                    color: "white",
                    padding: "0px",
                    borderRadius: "0px",
                    fontSize: "0.6rem",
                  }}
                  variant="contained"
                  className={classes.acceptButton}
                  size="small"
                  loading={loading}
                  onClick={() => handleCloseTicket(ticket.id)}
                >
                  {i18n.t("ticketsList.buttons.closed")}
                </ButtonWithSpinner>
              </>
            )}
            {ticket.status === "closed" && (
              <Tooltip title="Reabrir">
                <ReplayIcon
                  className={classes.actionIcon}
                  style={{ color: blue[500], cursor: "pointer" }}
                  onClick={() => handleReopenTicket(ticket.id)}
                />
              </Tooltip>
            )}
          </Box>
          <Box>
            {ticket.status === "pending" && !ticket.isGroup && (
              <Button
                variant="contained"
                size="small"
                onClick={() => handleAcceptTicket(ticket.id)}
                className={classes.botonAceptarEstiloImagen}
                fullWidth
              >
                <span style={{ fontSize: "0.75rem", fontWeight: "bold" }}>Aceptar</span>
              </Button>
            )}
            {ticket.status === "open" && !ticket.isGroup && (
              <Button
                variant="contained"
                size="small"
                onClick={() => handleCloseTicket(ticket.id)}
                className={classes.botonCerrarEstiloImagen}
              >
                <span style={{ fontSize: "0.7rem", fontWeight: "bold" }}>Cerrar</span>
              </Button>
            )}
            {/* Otros botones si necesitas */}
          </Box>
        </ListItemSecondaryAction>
      </ListItem>

      <Divider variant="inset" component="li" />
    </>
  );
};
export default TicketListItemCustom;
