/*
Copyright (c) 2011-2012, M Rawash <mrawash@gmail.com>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

let sessiondir_completer = function (context) {
    context.anchored=false;
    dir = options.sessiondir;
    if (/^~?\//.test(context.filter))
        completion.file(context,true);
    else {
        completion.file(context,true,dir+context.filter);
        context.keys.text = function (f) this.path.substr(dir.length);
    }
}

let sessiondir_setter = function (value) {
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
    'string', options.runtimepath+'/sessions/',
    {
        setter: sessiondir_setter,
    }
)

group.options.add(['sessionfile', 'sesfile'],
    'Current session file',
    'string', '',
    {
        presist: false
    }
)

group.options.add(['sessionoptions', 'sesop'],
    "Set what will be saved with :sessionsave",
    "stringlist", 'curdir,help,tabs',
    {
        completer: function (context) [
            ["blank", "Empty tabs"],
            ["curdir", "Current directory"],
            ["help", "Help tabs"],
            ["options", "All options and mappings"],
            ["runtime", "Current runtime path(s)"],
            ["sesdir", "Session directory as current directory"],
            ["tabs", "Normal tabs"]
        ]
    }
)

group.commands.add(['sessions[ave]','mkses[sion]'],
    'Save current window',
    function(args) {
        let filename = args[0] ? (/^~?\//.test(args[0]) ? args[0] :
                options.sessiondir+args[0]) : options.sessiondir+Date.now()+'.penta'
        let file = io.File(filename);
      
        dactyl.assert(!file.exists() || args.bang, _("io.exists", file.path.quote()));

        let sesop = options.sessionoptions.toString();
        let lines = new Array('" vim: set ft=pentadactyl:\n');

        if (/sesdir/.test(sesop))
            lines.push('silent cd '+options.sessiondir);
        else if (/curdir/.test(sesop))
            lines.push('silent cd '+io.cwd.path);
        
        if (/runtime/.test(sesop))
            lines.push('set runtimepath='+options.runtimepath);

        if (/options/.test(sesop)) {
            let cmds = [cmd.serialize().map(commands.commandToString, cmd) for
                    (cmd in commands.iterator()) if (cmd.serialize)];
            cmds = array.flatten(cmds);
            lines = lines.concat(cmds);
        }
        
        if (/tabs/.test(sesop)) {
            tabs.visibleTabs.forEach(function (tab, i) {
                let loc = tab.linkedBrowser.contentDocument.location.href;
                if (/^dactyl:\/\/help\//.test(loc) && !/help/.test(sesop))
                    return;
                if (loc == 'about:blank' && !/blank/.test(sesop))
                    return;
                lines.push('tabopen '+loc);
            });
        }

        try {
            file.write(lines.join('\n'));
        } catch(e) {
            dactyl.echoerr(_("io.notWriteable", file.path.quote()));
            return;
        };
        
        options.sessionfile=file.path;
        dactyl.echomsg('Saved session to '+file.path.quote());
    }, {
        argCount: '?',
    	bang: true,
        completer: sessiondir_completer
    }
);

group.commands.add(['sessiona[ppend]', 'sessionadd'],
    'Append tab(s) to a session file',
    function(args) {
        let file = io.File(/^~?\//.test(args[0]) ? args[0] : options.sessiondir+args[0]);
      
        if (!file.exists() || !file.isWritable() || file.isDirectory()) {
            dactyl.echoerr(_("io.notWriteable", file.path.quote()));
            return;
        }

        let data = '';
        if (args.bang) {
            tabs.visibleTabs.forEach(function (tab, i) {
                data+='\ntabopen '+tab.linkedBrowser.contentDocument.location.href;
            });
        } else {
            data+='\ntabopen '+gBrowser.mCurrentTab.linkedBrowser.contentDocument.location.href;
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
        completer: sessiondir_completer
    }
);

group.commands.add(['sessionl[oad]'],
    'Load a session file',
    function(args) {
        let file = io.File(/^~?\//.test(args[0]) ? args[0] : options.sessiondir+args[0]);

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
        completer: sessiondir_completer
    }
);

group.mappings.add([modes.NORMAL], ['ss'],
    'Save current window',
    function() CommandExMode().open('sessionsave! ')
);

group.mappings.add([modes.NORMAL], ['sa'],
    'Append tab(s) to a session file',
    function() CommandExMode().open('sessionappend ')
);

group.mappings.add([modes.NORMAL], ['sl'],
    'Load a session file',
    function() CommandExMode().open('sessionload ')
);


"use strict";
var INFO =
["plugin", {
        name: "penta-sessions", version: "0.2",
        href: "https://github.com/gwash/penta-sessions",
        summary: "Pentadactyl Session Manager",
        xmlns: "dactyl"
    },
    ["author", { email: "mrawash@gmail.com", }, "M Rawash"],
    ["license", { href: "http://www.gnu.org/licenses/gpl.html" }, "GPL"],
    ["project", { name: "Pentadactyl", "min-version": "1.0" }],
    ["p", {},
        "This plugin provides Vim-like session handeling."
    ],
    ["note", {},
        "Only operates on current window"
    ],
    ["item", {},
        ["tags", {}, "'sesdir' 'sessiondir'"],
        ["spec", {}, "'sessiondir' 'sesdir'"],
        ["type", {}, "string"],
        ["default", {}, options.get("sessiondir").stringDefaultValue],
        ["description", {},
            ["p", {},
                "The default directory to save/load sessions from."
            ]
        ]
    ],
    ["item", {},
        ["tags", {}, "'sesfile' 'sessionfile'"],
        ["spec", {}, "'sessionfile' 'sesfile'"],
        ["type", {}, "string"],
        ["default", {}, ""],
        ["description", {},
            ["p", {},
                "The session file you are currently working with, this will be set ", 
                "automatically whenever you save or load a session, but you can set it ",
                "manually if you want."
            ]
        ]
    ],
    ["item", {},
        ["tags", {}, "'sesop' 'sessionoptions'"],
        ["spec", {}, "'sessionoptions' 'sesop'"],
        ["type", {}, "stringlist"],
        ["default", {}, options.get("sessionoptions").stringDefaultValue],
        ["description", {},
            ["p", {},
                "Changes the effect of the", ["ex", {}, ":sessionsave"], " command.  It is a comma ",
                "separated list of words.  Each word enables saving and restoring something:"
            ],
            ["dl", {}, template.map(options.get("sessionoptions").completer(), function ([k, v])
                [["dt", {}, k], ["dd", {}, v]]
            )],
            ["note", {},
                "'sesdir' overrides 'curdir' if added."
            ]
        ]
    ],
    ["item", {},
        ["tags", {}, "ss :sessions :sessionsave :mkses :mksession"],
        ["strut"],
        ["spec", {}, ":sessions", ["oa", {}, "ave"], ["oa", {}, "!"], ["oa", {}, "file"]],
        ["spec", {}, "ss"],
        ["description", {},
            ["p", {},
                "Saves current session to an ExCommand ", ["oa", {}, "file"], " which can be ",
                "restored later with", ["ex", {}, ":sessionload ", ["oa", {}, "file"]], "."
            ],
            ["p", {},
                "If ", ["oa", {}, "file"], " is just a basename or a relative path (without leading ",
                "directory path), it will create a session file with that name in the", 
                ["o", {}, "sessiondir"], ". It also takes care of creating new directories if specified.",
                ["example", {}, ["ex", {}, ":sessionsave"], " pythonref"]
            ],
            ["p", {},
                "If no ", ["oa", {}, "file"], " was specified it will save to a numbered file ",
                "(based on current date) in ", ["o", {}, "sessiondir"], "."
            ],
            ["p", {},
                "Adding ! will overwrite the file if it exists.",
                ["example", {},
                    ["ex", {}, ":sessionsave!"], " ", options.runtimepath + "/sessions/gapi.penta"
                ]
            ]
        ]
    ],
    ["item", {},
        ["tags", {}, "sa :sessiona :sessionappend :sessionadd"],
        ["strut"],
        ["spec", {}, ":sessiona", ["oa", {}, "ppend"], ["oa", {}, "!"], ["oa", {}, "file"]],
        ["spec", {}, "sa"],
        ["description", {},
            ["p", {},
                "Appends current tab to an existing session ", ["oa", {}, "file"], ". If a ! was ",
                "supplied it will append all tabs in current window instead."
            ],
            ["p", {},
                "If ", ["oa", {}, "file"], " is a basename/relative path, it will look for it in ", 
                ["o", {}, "sessiondir"], "."
            ]
        ]
    ],
    ["item", {},
        ["tags", {}, "sl :sessionl :sessionload"],
        ["strut"],
        ["spec", {}, ":sessionl", ["oa", {}, "oad"], ["oa", {}, "!"], ["oa", {}, "file"]],
        ["spec", {}, "sl"],
        ["description", {},
            ["p", {},
                "Loads session from ", ["oa", {}, "file"], ", replacing all tabs in current window ",
                "if no ! was added."
            ],
            ["p", {},
                "If ", ["oa", {}, "file"], " is a basename/relative path, it will look for it in ",
                ["o", {}, "sessiondir"], "."
            ]
        ]
    ]
];

/* vim:se sts=4 sw=4 et: */
