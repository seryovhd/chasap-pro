import React, { useState, useEffect, useRef } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import { MenuItem, FormControl, InputLabel, Select } from "@material-ui/core";
import { Visibility, VisibilityOff } from "@material-ui/icons";
import { InputAdornment, IconButton } from "@material-ui/core";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import { i18n } from "../../translate/i18n";
import TextField from "@material-ui/core/TextField";

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
}));

const FlowBuilderAddQuestionModal = ({
  open,
  onSave,
  onUpdate,
  data,
  close,
}) => {
  const classes = useStyles();
  const isMounted = useRef(true);

  const initialState = {
    message: "",
    answerKey: "",
  };

  const [message, setMessage] = useState();
  const [activeModal, setActiveModal] = useState(false);
  const [integration, setIntegration] = useState();
  const [labels, setLabels] = useState({
    title: "Agregar pregunta al flujo",
    btn: "Agregar",
  });

  useEffect(() => {
    if (open === "edit") {
      setLabels({
        title: "Editar pregunta del flujo",
        btn: "Guardar",
      });
      console.log("FlowTybebotEdit", data.data.typebotIntegration);
      setMessage(data.data.typebotIntegration.message)
      setIntegration({
        ...data.data.typebotIntegration,
      });
      setActiveModal(true);
    } else if (open === "create") {
      setLabels({
        title: "Crear pregunta en el flujo",
        btn: "Guardar",
      });
      setIntegration(initialState);
      setActiveModal(true);
    }

    return () => {
      isMounted.current = false;
    };
  }, [open]);

  const handleClose = () => {
    close(null);
    setActiveModal(false);
  };

  const handleSavePrompt = (values) => {
    let oldVariable = localStorage.getItem("variables");

    if (open === "edit") {
      const oldNameKey = data.data.typebotIntegration.answerKey;

      oldVariable = oldVariable ? JSON.parse(oldVariable) : [];
      oldVariable = oldVariable.filter(item => item !== oldNameKey);
      localStorage.setItem('variables', JSON.stringify([...oldVariable, values.answerKey]));

      handleClose();
      onUpdate({
        ...data,
        data: { typebotIntegration: { ...values, message } },
      });

    } else if (open === "create") {
      oldVariable = oldVariable ? JSON.parse(oldVariable) : [];
      oldVariable = oldVariable.filter(item => item !== values.answerKey);
      localStorage.setItem('variables', JSON.stringify([...oldVariable, values.answerKey]));

      handleClose();
      onSave({
        typebotIntegration: {
          ...values,
          message
        },
      });
    }
  };

  return (
    <div className={classes.root}>
      <Dialog
        open={activeModal}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
        scroll="paper"
      >
        <DialogTitle id="form-dialog-title">
          {open === "create" ? `Agregar pregunta al flujo` : `Editar pregunta`}
        </DialogTitle>
        <Formik
          initialValues={integration}
          enableReinitialize={true}
          onSubmit={(values, actions) => {
            setTimeout(() => {
              handleSavePrompt(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ touched, errors, isSubmitting, values }) => (
            <Form style={{ width: "100%" }}>
              <DialogContent dividers>
                <TextField
                  label={"Mensaje"}
                  multiline
                  rows={7}
                  name="message"
                  error={touched.message && Boolean(errors.message)}
                  helperText={touched.message && errors.message}
                  variant="outlined"
                  margin="dense"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  fullWidth
                  required
                />
                <Field
                  as={TextField}
                  label="Guardar respuesta en variable"
                  name="answerKey"
                  error={touched.answerKey && Boolean(errors.answerKey)}
                  helperText={touched.answerKey && errors.answerKey}
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  required
                />
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={handleClose}
                  color="secondary"
                  variant="outlined"
                >
                  {i18n.t("contactModal.buttons.cancel")}
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  variant="contained"
                  className={classes.btnWrapper}
                  disabled={isSubmitting}
                >
                  {labels.btn}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </div>
  );
};

export default FlowBuilderAddQuestionModal;
