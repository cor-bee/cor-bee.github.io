function getStem(word) {
    return word.toLowerCase()
        .replace(/â/g, 'a')
        .replace(/ç/g, 'c')
        .replace(/ğ/g, 'g')
        .replace(/ı/g, 'i')
        .replace(/ñ/g, 'n')
        .replace(/ö/g, 'o')
        .replace(/q/g, 'k')
        .replace(/ş/g, 's')
        .replace(/ü/g, 'u')
        .replace(/ё/g, 'е') // Russian yo
}

function withStems(list) {
    const outList = list.map(function(item) {
        return { word: item, stem: getStem(item) };
    });
    return outList;
}
const HOST = 'https://bismigalis.pythonanywhere.com';
const maxListLength = 20;

var app = new Vue({
    el: '#app',
    data: {
        startPos: -1,
        pos: -1,
        wordInput: '',
        wordSelected: '',
        dictEntry: null,
        suggestList: [],
        list: [],
        historyList: [],
        suggestDb: {},
        wordsDb: {}
    },
    methods: {
        isActiveWord(property){
            return {
              'history-entry__active': this.wordSelected == property,
            }
        },
        submit: function (word) {
            if (!this.wordsDb[word]) {
                fetch(HOST + '/get_json?word=' + word).then(response => response.json()).then(data => {
                    if (Object.keys(data).length === 0) {
                        this.dictEntry = null;
                    } else {
                        this.dictEntry = data;
                        this.wordsDb[word] = data;
                        if (this.historyList.indexOf(word) == -1) {
                            this.historyList.push(word);
                        }
                    }
                });
            } else {
                this.dictEntry = this.wordsDb[word];
            }
            
        },
        submitEnter: function(event) {
            let word;
            if (this.list.length) {
                word = this.list[this.pos].word;
                this.wordSelected = word;
            } else {
                word = this.wordInput;
            }
            
            word && this.submit(word);
        },
        scrollList: function() {
            this.list = this.suggestList.slice(this.startPos, this.startPos + maxListLength);
        },
        upHandler: function(event) {
            event.preventDefault();
            if (this.pos > 0) {
                this.pos--;
            } else if (this.startPos > 0) {
                this.startPos--;
                this.scrollList();
            }
        },
        downHandler: function(event) {
            event.preventDefault();
            if (this.pos + 1 < this.list.length) {
                this.pos++;
            } else if (this.startPos + 1 < this.suggestList.length - this.pos) {
                this.startPos++;
                this.scrollList();
            }
        },
        pageUpHandler: function(event) {
            event.preventDefault();
            if (this.pos > 0) {
                this.pos = 0;
            } else if (this.startPos > maxListLength) {
                this.startPos -= maxListLength;
                this.scrollList();
            } else if (this.startPos > 0) {
                this.startPos = 0;
                this.scrollList();
            }
        },
        pageDownHandler: function(event) {
            event.preventDefault();
            if (this.pos + 1 < this.list.length) {
                this.pos = this.list.length - 1;
            } else if (this.startPos + 1 < this.suggestList.length - 2 * maxListLength) {
                this.startPos += maxListLength;
                this.scrollList();
            } else if (this.suggestList.length > maxListLength) {
                this.startPos = this.suggestList.length - maxListLength;
                this.scrollList();
            }
        },
        wordChangedHandler: function(event) {
            const word = event.target.value;
            const stem = getStem(word);
            if (word.length === 0) {
                this.suggestList = [];
                this.list = [];
                this.startPos = -1;
                this.pos = -1;
                this.dictEntry = null;
                this.wordSelected = '';
            } else if (!this.suggestDb[stem[0]]) {
                fetch(HOST + '/suggest?&token=' + word[0])
                    .then(response => response.json())
                    .then(data => {
                        this.suggestDb[stem[0]] = withStems(data);
                        this.updateList(getStem(this.wordInput));
                    });
            } else {
                this.updateList(stem);
            }
        },
        updateList: function(stem) {
            this.suggestList = stem ?
                this.suggestDb[stem[0]].filter(item => {
                    return item.stem.startsWith(stem)
                }) : [];
            this.startPos = 0;
            this.pos = 0;
            this.scrollList();
            if (this.suggestList.length == 1) {
                const word = this.list[0].word;
                this.wordSelected = word;
                this.submit(word);
            }
        },
        itemClick: function(item, index) {
            this.wordSelected = item;
            this.pos = index;
            this.dictEntry = null;
            this.submit(item);
        },
        historyItemClick: function(word) {
            this.wordSelected = word;
            this.dictEntry = null;
            this.submit(word);
        },
        accentize: function(word, article) {
            var pos = article.accent_pos;
            if (pos) {
                return word.substring(0, pos) + "\u0301" + word.substring(pos);
            } else {
                return word;
            }
        },
        insert_and_submit: function(str) {
            var word = str.split(' ')[0];
            this.wordSelected = word;
            this.submit(word);
        },
        json2html: function(input, word, dictEntry) {
            var pos = dictEntry.shortening_pos;
            if (pos != null) {
                input = input.replace(/~/g, pos == '0' ? word : word.substring(0, pos));
            }
            
            input = input.replace(/\\n/g, '\n');

            if (dictEntry.dict == 'crh-ru') {
                input = input.replace(/(лингв|перен|физ|хим|бот|биол|зоо|грам|геогр|астр|шк|мат|анат|ирон|этн|стр|рел|посл|уст)\./g,'<i class="spec">$&</i>');
                input = input.replace(/\/(.+?)\//g,'<i class="spec">$1</i>');
            }
            

            input = input.replace(/(ср|см)\. (.+)$/mg,
               function(str, p1, p2, offset, s) {
                   var words = p2.split(/\s*,\s*/);
                   var links = '';
                   words.forEach(function(val, index, arr) {
                       links += '<a href="#" onclick="return app.insert_and_submit(\''+val+'\');" >'+val+'</a>, ';
                   });
                   return '<i class="link">'+p1+'.</i> '+links.slice(0, -2);
               }
            );
            input = input.replace(/^(.[^)].+?) - (.+?)$/mg,'<b>$1</b> $2');
            input = input.replace('◊', '\n◊\n'); 
            input = input.replace(/\n/g, '<br/>');
            input = input.replace(/; /g, '<br/>');
            return input;
        }
    }
})
