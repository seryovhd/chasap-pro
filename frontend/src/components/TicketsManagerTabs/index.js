import React, { useContext, useEffect, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import {
  Add as AddIcon,
  PlaylistAddCheckOutlined as PlaylistAddCheckOutlinedIcon,
  Group as GroupIcon,
  Chat as ChatIcon,
  DoneAll as DoneAllIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Search as SearchIcon,
} from "@material-ui/icons";
import {
  makeStyles,
  Paper,
  InputBase,
  Tabs,
  Tab,
  Badge,
  Snackbar,
  IconButton,
  Button,
  Tooltip,
  Box,
  useTheme
} from "@material-ui/core";

import toastError from '../../errors/toastError';
import api from '../../services/api';
import NewTicketModal from '../NewTicketModal';
import TicketsList from '../TicketsListCustom';
import TicketsListGroup from '../TicketsListGroup';
import TabPanel from '../TabPanel';
import { i18n } from '../../translate/i18n';
import { AuthContext } from '../../context/Auth/AuthContext';
import { Can } from '../Can';
import { TagsFilter } from '../TagsFilter';
import { UsersFilter } from '../UsersFilter';

const useStyles = makeStyles((theme) => ({
  ticketsWrapper: {
    position: 'relative',
    display: 'flex',
    height: '100%',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  tabsHeader: {
    flex: 'none',
    height: 73,
    backgroundColor: theme.palette.tabHeaderBackground,
    paddingTop: "10px"
  },
  tab: {
    minWidth: 60,
    width: 60,
  },
  ticketOptionsBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.palette.ticketoptions,
    padding: theme.spacing(1),
  },
  serachInputWrapper: {
    flex: 1,
    backgroundColor: theme.palette.background.default,
    display: 'flex',
    borderRadius: 40,
    padding: 4,
    marginRight: theme.spacing(1),
  },
  searchIcon: {
    color: theme.palette.primary.main,
    marginLeft: 6,
    marginRight: 6,
    alignSelf: 'center',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    borderRadius: 25,
    outline: 'none',
  },
  addButtonStyled: {
    background: theme.palette.type === 'dark' ? '#9E9E9E' : '#1E88E5',
    color: theme.palette.type === 'dark' ? '#000' : '#fff',
    borderRadius: 12,
    padding: 8,
    boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.2)",
    transition: "background 0.3s, transform 0.2s",
    "&:hover": {
      background: "linear-gradient(135deg, #0056d2 0%, #4b00c2 100%)",
      transform: "scale(1.05)",
    },
  },
  rightActions: {
    display: 'flex',
    gap: theme.spacing(1),
    marginLeft: 'auto'
  },
  snackbar: {
    display: "flex",
    justifyContent: "space-between",
    backgroundColor: theme.palette.primary.main,
    color: "white",
    borderRadius: 30,
  },
  yesButton: {
    backgroundColor: "#FFF",
    color: "rgba(0, 100, 0, 1)",
    padding: "4px 8px",
    fontSize: "1em",
    fontWeight: "bold",
    textTransform: "uppercase",
    marginRight: theme.spacing(1),
    "&:hover": {
      backgroundColor: "darkGreen",
      color: "#FFF",
    },
    borderRadius: 30,
  },
  noButton: {
    backgroundColor: "#FFF",
    color: "rgba(139, 0, 0, 1)",
    padding: "4px 8px",
    fontSize: "1em",
    fontWeight: "bold",
    textTransform: "uppercase",
    "&:hover": {
      backgroundColor: "darkRed",
      color: "#FFF",
    },
    borderRadius: 30,
  },
}));

const TicketsManagerTabs = () => {
  const classes = useStyles();
  const theme = useTheme();
  const history = useHistory();

  const [isHoveredAll, setIsHoveredAll] = useState(false);
  const [isHoveredNew, setIsHoveredNew] = useState(false);
  const [isHoveredResolve, setIsHoveredResolve] = useState(false);
  const [isHoveredOpen, setIsHoveredOpen] = useState(false);
  const [isHoveredClosed, setIsHoveredClosed] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [searchParam, setSearchParam] = useState('');
  const [tab, setTab] = useState('open');
  const [tabOpen, setTabOpen] = useState('open');
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [showAllTickets, setShowAllTickets] = useState(false);
  const searchInputRef = useRef();
  const { user } = useContext(AuthContext);
  const { profile } = user;

  const [openCount, setOpenCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const userQueueIds = user.queues.map((q) => q.id);
  const [selectedQueueIds, setSelectedQueueIds] = useState(userQueueIds || []);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedDateRange, setSelectedDateRange] = useState({
    from: '',
    until: '',
  });

  const [closedBox, setClosedBox] = useState(false);
  const [groupBox, setGroupBox] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data } = await api.get('/settings/');
        const setting = data.find(s => s.key === 'viewclosed');
        if (setting?.value === 'enabled' || user.profile === 'admin') {
          setClosedBox(true);
        } else {
          setClosedBox(false);
        }
      } catch (err) {
        toastError(err);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data } = await api.get("/settings/");
        const checkGroup = data.find((s) => s.key === "CheckMsgIsGroup");
        if (checkGroup?.value !== "enabled") {
          setGroupBox(true);
        } else {
          setGroupBox(false);
        }
      } catch (err) {
        toastError(err);
        setGroupBox(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (
      user.profile.toUpperCase() === 'ADMIN'
    ) {
      setShowAllTickets(true);
    }
  }, []);

  useEffect(() => {
    if (tab === "group" && tabOpen !== "open") {
      setTabOpen("open");
    }
  }, [tab, tabOpen]);
  
  useEffect(() => {
    if (tab === 'search' && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [tab]);

  let searchTimeout;

  const handleSelectedDate = (value, range) => {
    setSelectedDateRange({ ...selectedDateRange, [range]: value });
  };

  const handleSearch = (e) => {
    const searchedTerm = e.target.value.toLowerCase();

    clearTimeout(searchTimeout);

    if (searchedTerm === '') {
      setSearchParam(searchedTerm);
      setTab('open');
      return;
    }

    searchTimeout = setTimeout(() => {
      setSearchParam(searchedTerm);
    }, 500);
  };

  const handleChangeTab = (e, newValue) => {
    setTab(newValue);
  };

  const handleSnackbarOpen = () => {
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };


  const CloseAllTicket = async () => {
    try {
      const { data } = await api.post("/tickets/closeAll", {
        status: tabOpen,
        selectedQueueIds,
      });

      handleSnackbarClose();

    } catch (err) {
      console.log("Error: ", err);
    }
  };

  const handleChangeTabOpen = (e, newValue) => {
    setTabOpen(newValue);
  };

  const applyPanelStyle = (status) => {
    if (tabOpen !== status) {
      return { width: 0, height: 0 };
    }
  };

  const handleCloseOrOpenTicket = (ticket) => {
    setNewTicketModalOpen(false);
    if (ticket !== undefined && ticket.uuid !== undefined) {
      history.push(`/tickets/${ticket.uuid}`);
    }
  };

  const handleSelectedTags = (selecteds) => {
    const tags = selecteds.map((t) => t.id);
    setSelectedTags(tags);
  };

  const handleSelectedUsers = (selecteds) => {
    const users = selecteds.map((t) => t.id);
    setSelectedUsers(users);
  };

  return (
    <Paper elevation={0} variant='outlined' className={classes.ticketsWrapper}>
      <NewTicketModal
        modalOpen={newTicketModalOpen}
        onClose={(ticket) => {
          // console.log('ticket', ticket);
          handleCloseOrOpenTicket(ticket);
        }}
      />

      {setClosedBox && (
        <>
          <Paper elevation={0} square className={classes.tabsHeader}>
            <Tabs
              value={tab}
              onChange={handleChangeTab}
              variant='fullWidth'
              indicatorColor='primary'
              textColor='primary'
              aria-label='icon label tabs example'
            >
              <Tab
                value={'open'}
                icon={<ChatIcon />}
                classes={{ root: classes.tab }}
              />
              {groupBox && (
                <Tab
                  value={'group'}
                  icon={<GroupIcon />}
                  classes={{ root: classes.tab }}
                />
              )}
              <Tab
                value={'closed'}
                icon={<DoneAllIcon />}
                classes={{ root: classes.tab }}
              />
              <Tab
                value={'search'}
                icon={<SearchIcon />}
                classes={{ root: classes.tab }}
              />
            </Tabs>
          </Paper>
        </>
      )}

      {!setClosedBox && (
        <>
          <Paper elevation={0} square className={classes.tabsHeader}>
            <Tabs
              value={tab}
              onChange={handleChangeTab}
              variant='fullWidth'
              indicatorColor='primary'
              textColor='primary'
              aria-label='icon label tabs example'
            >
              <Tab
                value={'open'}
                icon={<ChatIcon />}
                classes={{ root: classes.tab }}
              />
              {setGroupBox && (
                <Tab
                  value={'group'}
                  icon={<GroupIcon />}
                  classes={{ root: classes.tab }}
                />
              )}
            </Tabs>
          </Paper>
        </>
        // FIN PRIMER BLOQUE
      )}
      {tab !== "group" && (
        <Paper square elevation={0} className={classes.ticketOptionsBox}>
          <IconButton
            className={classes.addButtonStyled}
            onClick={() => setNewTicketModalOpen(true)}
          >
            <AddIcon />
          </IconButton>
          <Box className={classes.rightActions}>
            {user.profile === "admin" && (
              <Tooltip title={i18n.t("tickets.inbox.closedAll")}>
                <IconButton
                  onClick={() => setSnackbarOpen(true)}
                  size="small"
                  style={{
                    backgroundColor: theme.palette.type === 'dark' ? '#9E9E9E' : '#0000001f',
                    color: theme.palette.type === 'dark' ? '#1E88E5' : '#373a3c',
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    padding: 4,
                    boxShadow: "0px 2px 5px rgba(0, 0, 0, 0.2)",
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  <PlaylistAddCheckOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Can
              role={user.profile}
              perform="tickets-manager:showall"
              yes={() => (
                <Tooltip title={showAllTickets ? i18n.t("tickets.buttons.hideAll") : i18n.t("tickets.buttons.showAll")}>
                  <IconButton
                    onClick={() => setShowAllTickets((prev) => !prev)}
                    size="small"
                    style={{
                      backgroundColor: showAllTickets ? "#1976d2" : "#0000001f",
                      color: showAllTickets ? "#fff" : "#373a3c",
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      padding: 4,
                      boxShadow: "0px 2px 5px rgba(0, 0, 0, 0.2)",
                      transition: "all 0.3s ease",
                    }}
                  >
                    {showAllTickets ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              )}
            />
          </Box>
          <Snackbar
            open={snackbarOpen}
            onClose={() => setSnackbarOpen(false)}
            message={i18n.t("tickets.inbox.closedAllTickets")}
            ContentProps={{ className: classes.snackbar }}
            action={
              <>
                <Button
                  className={classes.yesButton}
                  size="small"
                  onClick={async () => {
                    await CloseAllTicket();
                    setSnackbarOpen(false);
                  }}
                >
                  {i18n.t("tickets.inbox.yes")}
                </Button>
                <Button
                  className={classes.noButton}
                  size="small"
                  onClick={() => setSnackbarOpen(false)}
                >
                  {i18n.t("tickets.inbox.no")}
                </Button>
              </>
            }
          />
        </Paper>
      )}
      <TabPanel value={tab} name='open' className={classes.ticketsWrapper}>
        <Tabs
          value={tabOpen}
          onChange={handleChangeTabOpen}
          indicatorColor='primary'
          textColor='primary'
          variant='fullWidth'
        >
          <Tab
            label={
              <Badge
                className={classes.badge}
                badgeContent={openCount}
                color='primary'
              >
                {i18n.t('ticketsList.assignedHeader')}
              </Badge>
            }
            value={'open'}
          />
          <Tab
            label={
              <Badge
                className={classes.badge}
                badgeContent={pendingCount}
                color='secondary'
              >
                {i18n.t('ticketsList.pendingHeader')}
              </Badge>
            }
            value={'pending'}
          />
        </Tabs>
        <Paper className={classes.ticketsWrapper}>
          <TicketsList
            status='open'
            showAll={showAllTickets}
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setOpenCount(val)}
            style={applyPanelStyle('open')}
          />
          <TicketsList
            status='pending'
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setPendingCount(val)}
            style={applyPanelStyle('pending')}
          />
        </Paper>
      </TabPanel>

      <TabPanel value={tab} name='group' className={classes.ticketsWrapper}>
        {tab !== "group" && (
          <Tabs
            value={tabOpen}
            onChange={handleChangeTabOpen}
            indicatorColor='primary'
            textColor='primary'
            variant='fullWidth'
          >
            <Tab
              label={
                <Badge
                  className={classes.badge}
                  badgeContent={openCount}
                  color='primary'
                >
                  {i18n.t('ticketsList.assignedHeader')}
                </Badge>
              }
              value={'open'}
            />
            <Tab
              label={
                <Badge
                  className={classes.badge}
                  badgeContent={pendingCount}
                  color='primary'
                >
                  {i18n.t('ticketsList.pendingHeader')}
                </Badge>
              }
              value={'pending'}
            />
          </Tabs>
        )}
        <Paper className={classes.ticketsWrapper}>
          <TicketsListGroup
            status='open'
            showAll={true}
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setOpenCount(val)}
            style={applyPanelStyle('open')}
          />
          <TicketsListGroup
            status='pending'
            showAll={true}
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setPendingCount(val)}
            style={applyPanelStyle('pending')}
          />
        </Paper>
      </TabPanel>

      <TabPanel value={tab} name='closed' className={classes.ticketsWrapper}>
        <TicketsList
          status='closed'
          showAll={true}
          selectedQueueIds={selectedQueueIds}
        />
        {groupBox && (
          <TicketsListGroup
            status='closed'
            showAll={true}
            selectedQueueIds={selectedQueueIds}
          />
        )}
      </TabPanel>
      <TabPanel value={tab} name='search' className={classes.ticketsWrapper}>
        <TagsFilter onFiltered={handleSelectedTags} />
        {(profile === 'admin') && (
          <UsersFilter onFiltered={handleSelectedUsers} />
        )}
        <TicketsList
          dateRange={selectedDateRange}
          searchParam={searchParam}
          showAll={true}
          tags={selectedTags}
          users={selectedUsers}
          selectedQueueIds={selectedQueueIds}
        />
      </TabPanel>
    </Paper>
  );
};

export default TicketsManagerTabs;
