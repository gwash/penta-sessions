/*
Copyright (c) 2011, M Rawash <mrawash@gmail.com>

Released under the most recent GPL <http://www.gnu.org/licenses/gpl.html>
*/

"use strict";
XML.ignoreWhitespace = false;
XML.prettyPrinting = false;
var INFO =
<plugin name="penta-sessions" version="0.1"
        href="https://github.com/gwash/penta-sessions"
        summary="Pentadactyl Session Manager"
        xmlns={NS}>
    <author email="mrawash@gmail.com">M Rawash</author>
    <license href="http://www.gnu.org/licenses/gpl.html">GPL</license>
    <project name="Pentadactyl" min-version="1.0"/>
    <p>
        This plugin provides Vim-like session handeling.
    </p>
        <note>Only operates on current window</note>
    <item>
        <tags>'sesdir' 'sessiondir'</tags>
        <spec>'sessiondir' 'sesdir'</spec>
        <type>string</type>
        <default>{options.runtimepath}/sessions/</default>
        <description>
            <p>
                The default directory to save/load sessions from.
            </p>
        </description>
    </item>
    <item>
        <tags>'sesfile' 'sessionfile'</tags>
        <spec>'sessionfile' 'sesfile'</spec>
        <type>string</type>
        <default></default>
        <description>
            <p>
                The session file you are currently working with, this will be set automatically whenever you
                save or load a session, but you can set it manually if you want.
            </p>
        </description>
    </item>
    <item>
        <tags>ss :sessions :sessionsave :mkses :mksession</tags>
        <strut/>
        <spec>:sessions<oa>ave</oa><oa>!</oa> <oa>file</oa></spec>
        <spec>ss</spec>
        <description>
            <p>
                Saves current session to an ExCommand <oa>file</oa>, which can be restored later 
                with <ex>:sessionload <oa>file</oa></ex>.
            </p>
            <p>
                If <oa>file</oa> is just a basename (without directory path), it will create a session file 
                with that name in the <o>sessiondir</o>.
                <example><ex>:sessionsave</ex> pythonref</example>
            </p>
            <p>
                If no <oa>file</oa> was specified it will save to a numbered file (based on current date) in <o>sessiondir</o>.
            </p>
            <p>
                Adding ! will overwrite the file if it exists.
                <example><ex>:sessionsave!</ex> {options.runtimepath}/sessions/gapi.penta</example>
            </p>
        </description>
    </item>
    <item>
        <tags>sa :sessiona :sessionappend :sessionadd</tags>
        <strut/>
        <spec>:sessiona<oa>ppend</oa><oa>!</oa> <oa>file</oa></spec>
        <spec>sa</spec>
        <description>
            <p>
                Appends current tab to an existing session file. If a ! was supplied it will append all tabs
                in current window instead.
            </p>
            <p>
                If <oa>file</oa> is a basename, it will look for it in <o>sessiondir</o>.
            </p>
        </description>
    </item>
    <item>
        <tags>sl :sessionl :sessionload</tags>
        <strut/>
        <spec>:sessionl<oa>oad</oa><oa>!</oa> <oa>file</oa></spec>
        <spec>sl</spec>
        <description>
            <p>
                Loads session from <oa>file</oa>, replacing all tabs in current window if no ! was added.
            </p>
            <p>
                If <oa>file</oa> is a basename, it will look for it in <o>sessiondir</o>.
            </p>
        </description>
    </item>
</plugin>;

var setsessiondir = function (value) {
    let dir = io.File(value);
    if (!dir.exists()) {
        try { dir.create(1,488) } catch(e) { return dactyl.echoerr(e.message) };
    } else if (!dir.isDirectory())
        return dactyl.echoerr(value+' is not a directory!');
    if (!/\/$/.test(value)) value+='/';
    return value
}

group.options.add(['sessiondir', 'sesdir'],
    'Default directory for saving sessions',
    'string',
    options.runtimepath+'/sessions/',
    {
        setter: setsessiondir,
    }
)

group.options.add(['sessionfile', 'sesfile'],
    'Current session file',
    'string', ''
)

group.commands.add(['sessions[ave]','mkses[sion]'],
    'Save current window',
    function(args) {
        let filename = args[0] ? (/\//.test(args[0]) ? args[0] : options.sessiondir+args[0])
                : options.sessiondir+Date.now()+'.penta'
        let file = io.File(filename);
      
        dactyl.assert(!file.exists() || args.bang, _("io.exists", file.path.quote()));

        let data = '" vim: set ft=pentadactyl:\n';
        data+='\ncd '+io.cwd.path;
        data+='\nse rtp='+options.runtimepath;
        data+='\nse sesdir='+options.sessiondir;
        tabs.visibleTabs.forEach(function (tab, i) {
            data+='\nt '+tab.linkedBrowser.contentDocument.location.href;
        });

        try {
            file.write(data);
        } catch(e) {
            dactyl.echoerr(_("io.notWriteable", file.path.quote()));
            return;
        };
        
        options.sessionfile=file.path;
        dactyl.echomsg('Saved session to '+file.path.quote());
    }, {
        argCount: '?',
    	bang: true,
        completer: function (context) {
            context.anchored=false;
            /^\//.test(context.filter) ? completion.file(context,true)
                : completion.file(context,true,options.sessiondir);
        }
    }
);

group.commands.add(['sessiona[ppend]', 'sessionadd'],
    'Append tab(s) to a session file',
    function(args) {
        let file = io.File(/\//.test(args[0]) ? args[0] : options.sessiondir+args[0]);
      
        if (!file.exists() || !file.isWritable() || file.isDirectory()) {
            dactyl.echoerr(_("io.notWriteable", file.path.quote()));
            return;
        }

        let data = '';
        if (args.bang) {
            tabs.visibleTabs.forEach(function (tab, i) {
                data+='\nt '+tab.linkedBrowser.contentDocument.location.href;
            });
        } else {
            data+='\nt '+gBrowser.mCurrentTab.linkedBrowser.contentDocument.location.href;
        }

        try {
            file.write(data,'>>');
        } catch(e) {
            dactyl.echoerr(_("io.notWriteable", file.path.quote()));
            return;
        };
        
        dactyl.echomsg('Appended tab(s) to session file '+file.path.quote());
    }, {
        argCount: '1',
    	bang: true,
        completer: function (context) {
            context.anchored=false;
            /^\//.test(context.filter) ? completion.file(context,true)
                : completion.file(context,true,options.sessiondir);
        }
    }
);

group.commands.add(['sessionl[oad]'],
    'Load a session file',
    function(args) {
        let file = io.File(/\//.test(args[0]) ? args[0] : options.sessiondir+args[0]);

        if (!file.exists() || !file.isReadable() || file.isDirectory()) {
            dactyl.echoerr(_("io.notReadable", file.path.quote()));
            return;
        }

        let curtab = gBrowser.mCurrentTab;
        if(!args.bang) tabs.keepOnly(curtab);
        let sessionscript = io.source(file.path);
        sessionscript.unload();
        options.sessionfile=file.path;
        if(!args.bang) tabs.remove(curtab);
        dactyl.echomsg('Loaded session from '+file.path.quote());
    }, {
        argCount: "1",
    	bang: true,
        completer: function (context) {
            context.anchored=false;
            /^\//.test(context.filter) ? completion.file(context,true)
                : completion.file(context,true,options.sessiondir);
        }
    }
);

group.mappings.add([modes.NORMAL], ['ss'],
    'Save current window',
    function() { CommandExMode().open('sessionsave! ')}
);

group.mappings.add([modes.NORMAL], ['sa'],
    'Append tab(s) to a session file',
    function() { CommandExMode().open('sessionappend ')}
);

group.mappings.add([modes.NORMAL], ['sl'],
    'Load a session file',
    function() { CommandExMode().open('sessionload ')}
);


/* vim:se sts=4 sw=4 et: */
