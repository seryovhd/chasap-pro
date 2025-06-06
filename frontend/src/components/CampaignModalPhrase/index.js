import React, { useState, useEffect, useRef, useContext } from "react";

import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import { ListItemText, MenuItem, Select, Typography } from "@material-ui/core";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Autocomplete, Checkbox, Chip, Stack } from "@mui/material";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  textField: {
    marginRight: theme.spacing(1),
    flex: 1,
  },
  extraAttr: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  btnWrapper: {
    position: "relative",
  },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
  online: {
    color: "green",
  },
  offline: {
    color: "red",
  },
}));

const CampaignModalPhrase = ({ open, onClose, FlowCampaignId, onSave }) => {
  const classes = useStyles();
  const isMounted = useRef(true);
  const { user } = useContext(AuthContext);
  const { companyId } = user;

  const [campaignEditable, setCampaignEditable] = useState(true);
  const attachmentFile = useRef(null);

  const [dataItem, setDataItem] = useState({
    name: "",
    phrase: "",
  });

  const [dataItemError, setDataItemError] = useState({
    name: false,
    flowId: false,
    phrase: false,
  });

  const [flowSelected, setFlowSelected] = useState();
  const [flowsData, setFlowsData] = useState([]);
  const [flowsDataComplete, setFlowsDataComplete] = useState([]);

  const [selectedWhatsapp, setSelectedWhatsapp] = useState("");
  const [whatsApps, setWhatsApps] = useState([]);

  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(true);

  const getFlows = async () => {
    const flows = await api.get("/flowbuilder");
    setFlowsDataComplete(flows.data.flows);
    setFlowsData(flows.data.flows.map((flow) => flow.name));
    return flows.data.flows;
  };

  const detailsPhrase = async (flows) => {
    setLoading(true);
    await api.get(`/flowcampaign/${FlowCampaignId}`).then((res) => {
      setDataItem({
        name: res.data.details.name,
        phrase: res.data.details.phrase,
      });
      setActive(res.data.details.status);
      const nameFlow = flows.find(
        (itemFlows) => itemFlows.id === res.data.details.flowId
      );
      if (nameFlow) {
        setFlowSelected(nameFlow.name);
      }
      setSelectedWhatsapp(res.data.details.whatsappId);
      setLoading(false);
    });
  };

  const handleClose = () => {
    onClose();
  };

  const openModal = async () => {
    const flows = await getFlows();
    if (FlowCampaignId) {
      await detailsPhrase(flows);
    } else {
      clearData();
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      api.get(`/whatsapp`, { params: { companyId, session: 0 } }).then(({ data }) => {
        setWhatsApps(data);
        setLoading(false);
      });
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, []);

  useEffect(() => {
    setLoading(true);
    if (open === true) {
      openModal();
    }
  }, [open]);

  const clearErrors = () => {
    setDataItemError({
      name: false,
      flowId: false,
      whatsappId: false,
      phrase: false,
    });
  };

  const clearData = () => {
    setFlowSelected();
    setDataItem({
      name: "",
      phrase: "",
    });
  };

  const applicationSaveAndEdit = () => {
    let error = 0;
    if (!dataItem.name?.trim()) {
      setDataItemError((old) => ({ ...old, name: true }));
      error++;
    }
    if (!flowSelected) {
      setDataItemError((old) => ({ ...old, flowId: true }));
      error++;
    }
    if (!dataItem.phrase?.trim()) {
      setDataItemError((old) => ({ ...old, phrase: true }));
      error++;
    }
    if (!selectedWhatsapp) {
      setDataItemError((old) => ({ ...old, whatsappId: true }));
    }

    if (error !== 0) {
      return;
    }

    const idFlow = flowsDataComplete.find((item) => item.name === flowSelected)?.id;
    const whatsappId = selectedWhatsapp ? parseInt(selectedWhatsapp) : null;
    const payload = {
      name: dataItem.name,
      flowId: idFlow,
      whatsappId,
      phrase: dataItem.phrase,
      status: active,
    };

    const request = FlowCampaignId
      ? api.put("/flowcampaign", { ...payload, id: FlowCampaignId })
      : api.post("/flowcampaign", payload);

    request.then(() => {
      onClose();
      onSave("ok");
      toast.success(
        FlowCampaignId
          ? "¡Frase actualizada con éxito!"
          : "¡Frase creada con éxito!"
      );
      clearData();
    });
  };

  return (
    <div className={classes.root}>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
        scroll="paper"
        PaperProps={{
          style: { borderRadius: "20px" }
        }}
      >
        <div style={{ display: "none" }}>
          <input type="file" ref={attachmentFile} />
        </div>
        {!loading && (
          <Stack sx={{ padding: "30px" }}>
            <Stack sx={{ gap: "14px" }}>
              <Stack gap={1}>
                <Typography>Nombre de la campaña</Typography>
                <TextField
                  name="text"
                  variant="outlined"
                  error={dataItemError.name}
                  value={dataItem.name}
                  margin="dense"
                  onChange={(e) =>
                    setDataItem((old) => ({ ...old, name: e.target.value }))
                  }
                  className={classes.textField}
                  style={{ width: "100%" }}
                />
              </Stack>
              <Stack gap={1}>
                <Typography>Elegir un flujo</Typography>
 <Autocomplete
  disablePortal
  id="combo-box-demo"
  value={flowSelected}
  onChange={(event, newValue) => {
    setFlowSelected(newValue);
  }}
  options={flowsData}
  sx={{ width: "100%" }}
  renderInput={(params) => (
    <TextField
      {...params}
      error={dataItemError.flowId}
      variant="outlined"
      style={{ width: "100%" }}
      placeholder="Elegir un flujo"
    />
  )}
/>
              </Stack>
              <Stack gap={1}>
                <Typography>Elegir conexión de WhatsApp</Typography>
 <Select
  required
  fullWidth
  displayEmpty
  variant="outlined"
  value={selectedWhatsapp || ""}
  onChange={(e) => setSelectedWhatsapp(e.target.value)}
  renderValue={() => {
    if (!selectedWhatsapp) {
      return "Selecciona una conexión";
    }
    const whatsapp = whatsApps.find((w) => w.id === selectedWhatsapp);
    return whatsapp?.name || "Conexión desconocida";
  }}
>
  {whatsApps.map((whatsapp, key) => (
    <MenuItem dense key={key} value={whatsapp.id}>
      <ListItemText
        primary={
          <Typography
            component="span"
            style={{
              fontSize: 14,
              marginLeft: "10px",
              display: "inline-flex",
              alignItems: "center",
              lineHeight: "2",
            }}
          >
            {whatsapp.name} &nbsp;
            <span
              className={
                whatsapp.status === "CONNECTED"
                  ? classes.online
                  : classes.offline
              }
            >
              ({whatsapp.status})
            </span>
          </Typography>
        }
      />
    </MenuItem>
  ))}
</Select>

              </Stack>
              <Stack gap={1}>
                <Typography>¿Qué frase activa el flujo? (Puedes usar * para activar con cualquier mensaje)</Typography>
                <TextField
                  name="text"
                  variant="outlined"
                  error={dataItemError.phrase}
                  value={dataItem.phrase}
                  margin="dense"
                  onChange={(e) =>
                    setDataItem((old) => ({ ...old, phrase: e.target.value }))
                  }
                  className={classes.textField}
                  style={{ width: "100%" }}
                />
              </Stack>
              <Stack direction={"row"} gap={2}>
                <Typography sx={{ alignSelf: "center" }}>Estado</Typography>
                <Checkbox
                  checked={active}
                  onChange={() => setActive((old) => !old)}
                />
              </Stack>
            </Stack>
            <Stack
              direction={"row"}
              spacing={2}
              alignSelf={"end"}
              marginTop={"16px"}
            >
              <Button
                variant="outlined"
                onClick={() => {
                  onClose();
                  clearErrors();
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={applicationSaveAndEdit}
              >
                {FlowCampaignId ? "Guardar campaña" : "Crear campaña"}
              </Button>
            </Stack>
          </Stack>
        )}
        {loading && (
          <Stack
            justifyContent={"center"}
            alignItems={"center"}
            minHeight={"10vh"}
            sx={{ padding: "52px" }}
          >
            <CircularProgress />
          </Stack>
        )}
      </Dialog>
    </div>
  );
};

export default CampaignModalPhrase;
