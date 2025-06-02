import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import ModalImage from "react-modal-image";
import api from "../../services/api";
import { toast } from "react-toastify";

const useStyles = makeStyles(theme => ({
	messageMedia: {
		objectFit: "cover",
		width: 250,
		height: 200,
		borderRadius: 8,
	},
}));

const ModalImageCors = ({ imageUrl }) => {
	const classes = useStyles();
	const [blobUrl, setBlobUrl] = useState("");
	const [isValidUrl, setIsValidUrl] = useState(true);

	useEffect(() => {
		const fetchImage = async () => {
			if (!imageUrl) return;

			try {
				// Validar la URL antes de usarla
				new URL(imageUrl);

				const { data, headers } = await api.get(imageUrl, {
					responseType: "blob",
				});
				const url = window.URL.createObjectURL(
					new Blob([data], { type: headers["content-type"] })
				);
				setBlobUrl(url);
			} catch (err) {
				console.error("Error al cargar imagen:", err);
				toast.error("No se pudo cargar la imagen.");
				setIsValidUrl(false);
			}
		};

		fetchImage();
	}, [imageUrl]);

	if (!isValidUrl) {
		return (
			<div
				style={{
					width: 250,
					height: 200,
					borderRadius: 8,
					backgroundColor: "#f0f0f0",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: "#666",
					fontSize: 14,
					textAlign: "center",
				}}
			>
				Error al mostrar la imagen
			</div>
		);
	}

	return (
		<ModalImage
			className={classes.messageMedia}
			smallSrcSet={blobUrl || imageUrl}
			medium={blobUrl || imageUrl}
			large={blobUrl || imageUrl}
			alt="Imagen adjunta"
		/>
	);
};

export default ModalImageCors;
