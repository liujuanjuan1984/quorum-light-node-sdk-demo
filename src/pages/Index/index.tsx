import React from 'react';
import { observer, useLocalObservable } from 'mobx-react-lite';
import Welcome from './Welcome';
import { TextField, Tooltip } from '@material-ui/core';
import { HiOutlineMenu, HiX } from 'react-icons/hi';
import Button from 'components/Button';
import QuorumLightNodeSDK, { IContent } from 'quorum-light-node-sdk';
import { useStore } from 'store';
import sleep from 'utils/sleep';
import { RiCheckDoubleFill, RiCheckLine } from 'react-icons/ri';
import classNames from 'classnames';
import KeystoreModal from './KeystoreModal';
import TrxModal from './TrxModal';
import multiavatar from '@multiavatar/multiavatar'

export default observer(() => {
  const { snackbarStore, confirmDialogStore } = useStore();
  const state = useLocalObservable(() => ({
    started: !!localStorage.getItem('privateKey'),
    inputValue: '',
    ids: [] as string[],
    map: {} as Record<string, IContent>,
    showMenu: false,
    lastTrxId: '',
    privateKey: '',
    mySenderPubkey: '',
    keyReady: false,
    contentReady: false,
    openKeystoreModal: false,
    switchingAccount: false,
    openTrxModal: false,
    trxId: '',
    sending: false,
    pending: true,
    get group () {
      const urlGroupId = window.location.search.split('=')[1];
      if (urlGroupId) {
        return QuorumLightNodeSDK.cache.Group.get(urlGroupId);
      }
      const groups = QuorumLightNodeSDK.cache.Group.list();
      return groups[groups.length - 1] || null;
    },
    get isReady() {
      return state.keyReady && state.contentReady
    }
  }));
  const listContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    (async () => {
      if (state.isReady) {
        await sleep(200);
        state.pending = false;
      }
    })();
  }, [state.isReady])

  React.useEffect(() => {
    if (!state.started || !state.group) {
      return;
    }
    (async () => {
      state.privateKey = localStorage.getItem('privateKey') as string;
      state.mySenderPubkey = QuorumLightNodeSDK.utils.getSenderPubkey(state.privateKey);
      state.keyReady = true;
    })();

  }, [state.started]);

  React.useEffect(() => {
    if (!state.started || !state.group) {
      return;
    }

    list();

    const timer = setInterval(() => {
      list();
    }, 2000);

    return () => {
      clearInterval(timer);
    }
  }, [state.started]);


  const goToBottom = () => {
    if (listContainerRef.current && listContainerRef.current?.lastChild) {
      (listContainerRef.current?.lastChild as any).scrollIntoView()
    }
  }

  const list = async () => {
    try {
      const contents = await QuorumLightNodeSDK.chain.Content.list({
        groupId: state.group!.groupId,
        count: 1000,
        startTrx: state.lastTrxId
      });
      let hasNewContent = false;
      if (contents.length > 0) {
        for (const content of contents) {
          if (!state.map[content.TrxId]) {
            state.ids.push(content.TrxId);
            state.map[content.TrxId] = content;
            hasNewContent = true;
          } else if (state.map[content.TrxId].TimeStamp === 0) {
            state.map[content.TrxId] = content;
          }
        }
        state.lastTrxId = contents[contents.length - 1].TrxId;
        if (hasNewContent && contents.length > 2) {
          await sleep(1);
          goToBottom();
        }
      }
      state.contentReady = true;
    } catch (err) {
      console.log(err);
    }
  }

  const send = async (value: string) => {
    if (state.sending) {
      return;
    }
    state.sending = true;
    try {
      const res = await QuorumLightNodeSDK.chain.Trx.create({
        groupId: state.group!.groupId,
        object: {
          content: value,
          type: "Note",
          name: ""
        },
        aesKey: state.group!.cipherKey,
        privateKey: state.privateKey
      });
      console.log({ res });
      state.ids.push(res.trx_id);
      state.map[res.trx_id] = {
        Data: {
          type: 'Note',
          content: value,
          name: ''
        },
        Expired: 0,
        GroupId: '',
        SenderPubkey: state.mySenderPubkey,
        SenderSign: '',
        TimeStamp: 0,
        TrxId: res.trx_id,
        Version: '',
      }
      setTimeout(goToBottom, 1);
    } catch (err) {
      console.log(err);
      snackbarStore.show({
        message: '发送失败',
        type: 'error'
      })
    }
    state.sending = false;
  }

  if (!state.group) {
    snackbarStore.show({
      message: '暂不支持这个 group',
      type: 'error'
    })
    return null;
  }

  if (!state.started) {
    return (
      <Welcome start={() => {
        state.started = true;
      }} />
    )
  }

  return (
    <div className="box-border mt-5 w-[600px] mx-auto">
      <div className="bg-gray-f2 rounded-12">
        <div className="py-4 px-8 text-gray-88 text-18 border-b border-gray-d8" onClick={goToBottom}>
          {state.group!.groupName}
        </div>
        <div className="h-[76vh] overflow-auto px-8 pt-5 pb-2" ref={listContainerRef}>
          {state.ids.map((id) => {
            const content = state.map[id];
            const fromMyself = content.SenderPubkey === state.mySenderPubkey;
            return (
              <div className={classNames({
                'flex-row-reverse': fromMyself
              }, "mb-3 py-1 flex items-center w-full")} key={id}>
                <div className="w-[42px] h-[42px] bg-white rounded-full" dangerouslySetInnerHTML={{
                  __html: multiavatar(content.SenderPubkey)
                }} />
                <Tooltip
                  placement={fromMyself ? 'left' : 'right'}
                  title="点击查看 Trx"
                  disableHoverListener={content.TimeStamp === 0}
                  arrow
                  onClick={() => {
                    if (content.TimeStamp === 0) {
                      return;
                    }
                    state.trxId = content.TrxId;
                    state.openTrxModal = true;
                  }}
                >
                  <div className={classNames({
                    'bg-[#95EC69]': fromMyself,
                    'bg-white': !fromMyself
                  }, "max-w-[360px] text-slate-800 px-3 py-[10px] rounded-5 text-16 mx-3 relative cursor-pointer")}>
                    {content.Data.content}
                    {fromMyself && (
                      <div className={classNames({
                        "bottom-[4px] left-[-28px]": fromMyself,
                        "bottom-[4px] right-[-28px]": !fromMyself,
                      }, "text-18 absolute")}>
                        {content.TimeStamp === 0 ? <RiCheckLine className="opacity-30" /> : (
                          <div>
                            <RiCheckDoubleFill className="text-[#39D101] cursor-pointer opacity-70" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Tooltip>
              </div>
            )
          })}
        </div>
      </div>
      <div className="mt-5 relative flex items-center">
        <div className="w-[42px] h-[42px] rounded-full mr-3" dangerouslySetInnerHTML={{
          __html: multiavatar(state.mySenderPubkey)
        }} />
        <TextField
          placeholder='说点什么...'
          value={state.inputValue}
          onChange={(e) => { state.inputValue = e.target.value; }}
          variant="outlined"
          fullWidth
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && state.inputValue) {
              send(state.inputValue.trim());
              state.inputValue = '';
            }
          }}
        />
        <div className="absolute right-[-80px] top-0 text-20 text-gray-400 h-10 w-10 flex items-center justify-center border border-gray-400 rounded-full cursor-pointer" onClick={() => {
          state.showMenu = !state.showMenu;
        }}>
          {!state.showMenu && <HiOutlineMenu />}
          {state.showMenu && <HiX />}
        </div>
        {state.showMenu && (
          <div className="absolute right-[-170px] top-[-150px] text-20 text-gray-400 animate-fade-in">
            <Button color="gray" outline onClick={() => {
              state.switchingAccount = false;
              state.openKeystoreModal = true;
            }}>我的帐号信息</Button>
            <div />
            <Button color="gray" outline className="mt-4" onClick={() => {
              state.switchingAccount = true;
              state.openKeystoreModal = true;
            }}>使用其他账号</Button>
            <div />
            <Button color="gray" outline className="mt-4" onClick={() => {
              confirmDialogStore.show({
                content: '确定退出帐号吗？',
                ok: async () => {
                  confirmDialogStore.hide();
                  await sleep(400); 
                  localStorage.removeItem('keystore');
                  localStorage.removeItem('password');
                  localStorage.removeItem('privateKey');
                  window.location.reload();
                },
              });
            }}>退出</Button>
          </div>
        )}
        <KeystoreModal
          switchingAccount={state.switchingAccount}
          open={state.openKeystoreModal}
          onClose={() => {
          state.openKeystoreModal = false;
        }} />
        <TrxModal
          groupId={state.group!.groupId}
          trxId={state.trxId}
          open={state.openTrxModal}
          onClose={() => {
          state.openTrxModal = false;
        }} />
      </div>
      {state.pending && (
        <div className="fixed inset-0 bg-white flex items-center justify-center text-gray-88 text-18">
          <div className="-mt-20 tracking-wider">
            加载中...
          </div>
        </div>
      )}
    </div>
  )
});
