/**
 * MessageOptionsMenu
 * 
 * Este componente representa un menú contextual (dropdown o popover) que se muestra 
 * cuando el usuario hace clic en los tres puntos o botón de opciones de un mensaje.
 * Permite realizar varias acciones sobre un mensaje específico, como:
 * 
 * - Responder al mensaje
 * - Reenviar el mensaje
 * - Editar el mensaje (si es propio)
 * - Eliminar el mensaje (si es propio)
 * - Transcribir mensajes de audio (si son recibidos)
 * - Reaccionar al mensaje con un conjunto de emojis (primeros 6 rápidos + lista completa)
 * 
 * Utiliza contextos para manejar:
 * - La respuesta a mensajes (`ReplyMessageContext`)
 * - El reenvío de mensajes y su estado (`ForwardMessageContext`)
 * 
 * También gestiona diálogos y popovers para:
 * - Confirmar eliminación de mensaje
 * - Modal para editar mensajes
 * - Menú emergente para reacciones rápidas y extendidas
 * 
 * Incluye soporte visual personalizado con `Material-UI` y `toast` para notificaciones.
 */

import React, { useState, useContext } from "react";
import PropTypes from "prop-types";

import AddCircleOutlineIcon from '@material-ui/icons/Add';

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ConfirmationModal from "../ConfirmationModal";
import { Menu, MenuItem, MenuList, Grid, Popover, IconButton, makeStyles } from "@material-ui/core";
import { ReplyMessageContext } from "../../context/ReplyingMessage/ReplyingMessageContext";
import EditMessageModal from "../EditMessageModal";
import { ForwardMessageContext } from "../../context/ForwarMessage/ForwardMessageContext";
import ForwardModal from "../../components/ForwardMessageModal";
import {toast} from "react-toastify";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
	iconButton: {
	  padding: '4px', // Ajuste o valor conforme necessário
	},
	gridContainer: {
	  padding: '10px',
	  justifyContent: 'center',
	},
	addCircleButton: {
	  padding: '8px',
	  fontSize: '2rem', // Aumentar o tamanho do ícone
	  backgroundColor: 'rgb(242 242 247);',
	},
	popoverContent: {
	  maxHeight: '300px', // Ajuste conforme necessário
	  overflowY: 'auto',
	  '&::-webkit-scrollbar': {
		width: '0.4em',
		height: '0.4em',
	  },
	  '&::-webkit-scrollbar-thumb': {
		backgroundColor: 'rgba(0,0,0,.1)',
		borderRadius: '50px',
	  },
	  '&::-webkit-scrollbar-track': {
		boxShadow: 'inset 0 0 6px rgba(0,0,0,0.00)',
		webkitBoxShadow: 'inset 0 0 6px rgba(0,0,0,0.00)',
	  },
	},
	hideScrollbar: {
	  maxHeight: '300px',
	  overflow: 'hidden',
	},
  }));

const MessageOptionsMenu = ({ message, menuOpen, handleClose, anchorEl }) => {
	const classes = useStyles();
	const { setReplyingMessage } = useContext(ReplyMessageContext);
	const [confirmationOpen, setConfirmationOpen] = useState(false);
	const [confirmationEditOpen, setEditMessageOpenModal] = useState(false);
	const [messageEdit, setMessageEdit] = useState(false);
	const [reactionAnchorEl, setReactionAnchorEl] = useState(null);
	const [moreAnchorEl, setMoreAnchorEl] = useState(null);

	  // Transcrição de áudio
	  const [showTranscribedText, setShowTranscribedText] = useState(false);
	  const [audioMessageTranscribeToText, setAudioMessageTranscribeToText] = useState("");

	const {
		showSelectMessageCheckbox,
		setShowSelectMessageCheckbox,
		selectedMessages,
		forwardMessageModalOpen,
		setForwardMessageModalOpen } = useContext(ForwardMessageContext);
		

	const handleDeleteMessage = async () => {
		try {
			await api.delete(`/messages/${message.id}`);
			console.log("🧨 Eliminando mensaje -1:", message.id);

		} catch (err) {
			toastError(err);
		}
	};

	const openReactionsMenu = (event) => {
		setReactionAnchorEl(event.currentTarget);
		handleClose();
	};
	
	const closeReactionsMenu = () => {
		setReactionAnchorEl(null);
		handleClose();
	};

	const openMoreReactionsMenu = (event) => {
		setMoreAnchorEl(event.currentTarget);
		closeReactionsMenu();  // Fechar o primeiro popover
	};

	const closeMoreReactionsMenu = () => {
		setMoreAnchorEl(null);
	};

	const handleReactToMessage = async (reactionType) => {
		try {
			await api.post(`/messages/${message.id}/reactions`, { type: reactionType });
			toast.success(i18n.t("messageOptionsMenu.reactionSuccess"));
		} catch (err) {
			toastError(err);
		}
		handleClose();
		closeMoreReactionsMenu(); // Fechar o menu de reações ao reagir
	};

	// Array de emojis
    const availableReactions = [
		'😀', '😂', '❤️', '👍', '🎉', '😢', '😮', '😡', '👏', '🔥',
        '🥳', '😎', '🤩', '😜', '🤔', '🙄', '😴', '😇', '🤯', '💩',
        '🤗', '🤫', '🤭', '🤓', '🤪', '🤥', '🤡', '🤠', '🤢', '🤧',
        '😷', '🤕', '🤒', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃',
        '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🙈',
        '🙉', '🙊', '🐵', '🐒', '🦍', '🐶', '🐕', '🐩', '🐺', '🦊',
        '🦝', '🐱', '🐈', '🦁', '🐯', '🐅', '🐆', '🐴', '🐎', '🦄'
	];	

	const handleSetShowSelectCheckbox = () => {
		setShowSelectMessageCheckbox(!showSelectMessageCheckbox);
		handleClose();
	};

	const handleEditMessage = async () => {
		try {
			await api.put(`/messages/${message.id}`);
		} catch (err) {
			toastError(err);
		}
	}

	const handleTranscriptionAudioToText = async () => {
		try {
			const audioUrl = String(message.mediaUrl);
			const match = audioUrl.match(/\/([^\/]+\.ogg)$/);
			const extractedPart = match ? match[1] : null;
			if (!extractedPart) {
				throw new Error('Formato de URL de áudio inesperado');
			}
			const response = await api.get(`/messages/transcribeAudio/${extractedPart}`);
			const { data } = response;
			if (data && typeof data.transcribedText === 'string') {
				setAudioMessageTranscribeToText(data.transcribedText);
				setShowTranscribedText(true);
				handleClose();
			} else if (data && data.error) {
				throw new Error(data.error);
			} else {
				throw new Error('Dados de transcrição inválidos');
			}
		} catch (err) {
			toastError(err.message || 'Erro desconhecido');
		}
	};

	const hanldeReplyMessage = () => {
		setReplyingMessage(message);
		handleClose();
	};

	const handleOpenConfirmationModal = e => {
		setConfirmationOpen(true);
		handleClose();
	};

	const handleOpenEditMessageModal = e => {
		setEditMessageOpenModal(true);
		setMessageEdit(message)
		handleClose();
	};

	return (
		<>
			<ForwardModal
			modalOpen={forwardMessageModalOpen}
			messages={selectedMessages}
			onClose={(e) => {
				setForwardMessageModalOpen(false);
				setShowSelectMessageCheckbox(false);
			}}
				/>
			<ConfirmationModal
				title={i18n.t("messageOptionsMenu.confirmationModal.title")}
				open={confirmationOpen}
				onClose={setConfirmationOpen}
				onConfirm={handleDeleteMessage}
			>
				{i18n.t("messageOptionsMenu.confirmationModal.message")}
			</ConfirmationModal>
			<EditMessageModal
				title={i18n.t("messageOptionsMenu.editMessageModal.title")}
				open={confirmationEditOpen}
				onClose={setEditMessageOpenModal}
				onSave={handleEditMessage}
				message={message}
			>
				{i18n.t("messageOptionsMenu.confirmationModal.message")}
			</EditMessageModal>
			<Menu
				anchorEl={anchorEl}
				getContentAnchorEl={null}
				anchorOrigin={{
					vertical: "bottom",
					horizontal: "right",
				}}
				transformOrigin={{
					vertical: "top",
					horizontal: "right",
				}}
				open={menuOpen}
				onClose={handleClose}
			>
				<MenuItem onClick={handleSetShowSelectCheckbox}>
					{i18n.t("messageOptionsMenu.forward")}
				</MenuItem>
				{message.fromMe && (
					<MenuItem onClick={handleOpenEditMessageModal}>
						{i18n.t("messageOptionsMenu.edit")}
					</MenuItem>
				)}
				{message.fromMe && (
					<MenuItem onClick={handleOpenConfirmationModal}>
						{i18n.t("messageOptionsMenu.delete")}
					</MenuItem>
				)}
			 {(message.mediaType === "audio" && !message.fromMe) && (
					<MenuItem onClick={handleTranscriptionAudioToText}>
						{i18n.t("Transcrever áudio")}
					</MenuItem>
				)}
				<MenuItem onClick={hanldeReplyMessage}>
					{i18n.t("messageOptionsMenu.reply")}
				</MenuItem>
				<MenuItem onClick={openReactionsMenu}>
				{i18n.t("messageOptionsMenu.react")}
				</MenuItem>
			</Menu>
			<Popover
					open={Boolean(reactionAnchorEl)}
					anchorEl={reactionAnchorEl}
					onClose={closeReactionsMenu}
					anchorOrigin={{
						vertical: 'bottom',
						horizontal: 'right',
					}}
					transformOrigin={{
						vertical: 'top',
						horizontal: 'right',
					}}
					PaperProps={{
						style: { width: 'auto', maxWidth: '380px', borderRadius: '50px'  }
					}}
				>
					<div className={classes.hideScrollbar}>
					<Grid container spacing={1} className={classes.gridContainer}>
						{availableReactions.slice(0, 6).map(reaction => (
							<Grid item key={reaction}>
								<IconButton className={classes.iconButton} onClick={() => handleReactToMessage(reaction)}>
									{reaction}
								</IconButton>
							</Grid>
						))}
						<Grid item>
						<IconButton className={classes.addCircleButton} onClick={openMoreReactionsMenu}>
								<AddCircleOutlineIcon fontSize="normal" />
							</IconButton>
						</Grid>
					</Grid>
					</div>
				</Popover>
				<Popover
					open={Boolean(moreAnchorEl)}
					anchorEl={moreAnchorEl}
					onClose={closeMoreReactionsMenu}
					anchorOrigin={{
						vertical: 'bottom',
						horizontal: 'center',
					}}
					transformOrigin={{
						vertical: 'top',
						horizontal: 'center',
					}}
					PaperProps={{
						style: { width: 'auto', maxWidth: '400px', borderRadius: '6px' }
					}}
				>
					<div className={classes.popoverContent}>
					<Grid container spacing={1} className={classes.gridContainer}>
						{availableReactions.map(reaction => (
							<Grid item key={reaction}>
								<IconButton className={classes.iconButton} onClick={() => handleReactToMessage(reaction)}>
									{reaction}
								</IconButton>
							</Grid>
						))}
					</Grid>
					</div>
				</Popover>
		</>
	);
};

MessageOptionsMenu.propTypes = {
    message: PropTypes.object,
    menuOpen: PropTypes.bool.isRequired,
    handleClose: PropTypes.func.isRequired,
    anchorEl: PropTypes.object,
    onReaction: PropTypes.func, // Callback opcional chamado após uma reação
    availableReactions: PropTypes.arrayOf(PropTypes.string) // Lista opcional de reações disponíveis
}

export default MessageOptionsMenu;