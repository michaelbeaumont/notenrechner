//stackoverflow.com/questions/11582512/how-to-get-url-parameters-with-javascript/11582513#11582513
function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null
}

//VARIABLES
var next_id = 1;
var classes = {};
var sem_view = false;

//MODULES
//In JSON files in ./studiengaenge

//MATH
function calc_note(classes) {
    var weighted_note = 0.0;
    var total_weight = 0.0;
    Object.keys(classes).forEach(function(area) {
        var area = classes[area];
        Object.keys(area.classes).forEach(function(row) {
            var row = area.classes[row];
            if (row.use && row.note >= 1.0) {
                weighted_note += row.note*row.weight;
                total_weight += row.weight;
            }
        })});
    if (total_weight > 0) {
        var note = (weighted_note / total_weight);
        var strikes = find_strikes(classes, weighted_note, total_weight);
        return {note:note, strikes:strikes};
    } else {
        return {note:0, strikes:{}};
    }
}

function find_strikes(classes, weighted_note, total_weight) {
    var struck_last = true;
    var struck_weight = total_weight;
    var struck_weighted_note = weighted_note;
    var strikes = {};
    while(struck_last) {
        struck_last = false;
        Object.keys(classes).forEach(function(area_id) {
            area = classes[area_id];
            if (!area.unstrikeable) {
                var area_worst_id;
                var area_best_note = struck_weighted_note/struck_weight;
                Object.keys(area.classes).forEach(function(row_id) {
                    var row = area.classes[row_id];
                    if (row.use && row.note >= 1.0) {
                        var new_weight = struck_weight - row.weight;
                        var new_note = (struck_weighted_note - row.note*row.weight)/new_weight;

                        if (new_note < area_best_note) {
                            area_best_note = new_note;
                            area_worst_id = row_id;
                        }
                    }
                });
                if (area_worst_id != undefined ) {
                    if(strikes[area_id] == undefined) {
                        struck_last = true;
                        var area_worst = area.classes[area_worst_id];
                        struck_weight = struck_weight - area_worst.weight;
                        struck_weighted_note = struck_weighted_note - area_worst.note*area_worst.weight;
                    }
                    strikes[area_id] = area_worst_id;
                }
            }
        });
    }
    return {strikes:strikes
            ,note:struck_weighted_note/struck_weight
           };
}


//INIT
function load_from_url() {
    var classes_str = getURLParameter('save');
    var view_str = getURLParameter('sem_view');
    if (classes_str != null) {
        classes_str = decodeURIComponent(classes_str);
        view_str = decodeURIComponent(view_str);
        classes = JSON.parse(classes_str);
        sem_view = JSON.parse(view_str);
        console.log('Loaded state from URL');
        return true;
    } else {
        return false;
    }
}

function register_row(area_id, row) {
    var ind = next_id;
    next_id += 1;
    var area = classes[area_id];
    row.use = true;
    area.classes[ind] = row;
    if (area.classes[ind].sem == undefined) {
        area.classes[ind].sem = 5;
    }
    return ind;
}

function create_area(area) {
    var area_id = area.name;
    classes[area_id] = {name:area.name
                        ,classes:{}
                        ,modifiable:area.modifiable
                        ,unstrikeable:area.unstrikeable};
    area.classes.forEach(function(row) {
        register_row(area_id, row);
    });
}

//CONTROL LOGIC
//VERIFY INPUT
function check_new(area_id) {
    var new_row = {};
    var error = false;
    new_row.name = $("#"+area_id+" .add-class input.name").val();
    new_row.note = parseFloat($("#"+area_id+" .add-class input.note").val());
    new_row.weight = parseFloat($("#"+area_id+" .add-class input.weight").val());
    unmark_error($("#"+area_id+" .add-class input.note"));
    unmark_error($("#"+area_id+" .add-class input.weight"));
    if (Number.isNaN(new_row.note) || new_row.note < 1.0 || new_row.note > 4.0) {
        mark_error($("#"+area_id+" .add-class input.note"));
        error = true;
    } 
    if (Number.isNaN(new_row.weight) || new_row.weight <= 0) {
        mark_error($("#"+area_id+" .add-class input.weight"));
        error = true;
    }
    if (!error) {
        register_row(area_id, new_row);
        return true;
    }
    return false;
}

//VIEW---------------
//EVENT HANDLERS
function cancel(e) {
    if (e.preventDefault) {e.preventDefault();}
    e.originalEvent.dataTransfer.dropEffect = 'move';
    return false;
}
function tbody_handle_drop(e) {
    e.preventDefault();
    var draggedId = e.originalEvent.dataTransfer.getData('text/plain');
    var draggedTr = $("#"+draggedId);
    draggedTr.css('opacity',1);
    var newTbody = $(this);

    var sId = newTbody.attr('data-sid');
    //figure out new position
    var draggedRid = draggedTr.attr('data-rid');
    var draggedFb = draggedTr.attr('data-fb');

    draggedTr.appendTo(newTbody);
    classes[draggedFb].classes[draggedRid].sem = sId;
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    return false;
}
function tr_handle_drop(e) {
    event.preventDefault();
    var draggedId = e.originalEvent.dataTransfer.getData('text/plain');
    var draggedTr = $("#"+draggedId);
    draggedTr.css('opacity',1);
    var newNeighborTr = $(this);

    //figure out new position
    var newNeighborTop = newNeighborTr.offset().top - $(window).scrollTop();
    var newNeighborHalfway = newNeighborTr.height()/2;
    var mouseOffset = e.originalEvent.clientY - newNeighborTop;
    var indOffset = newNeighborTr.index() - draggedTr.index();

    if ((mouseOffset > newNeighborHalfway && indOffset != -1)
        || indOffset == 1) {
        draggedTr.insertAfter(newNeighborTr);
    } else {
        draggedTr.insertBefore(newNeighborTr);
    }

    var draggedRid = draggedTr.attr('data-rid');
    var draggedFb = draggedTr.attr('data-fb');

    var newNeighborRid = newNeighborTr.attr('data-rid');
    var newNeighborFb = newNeighborTr.attr('data-fb');

    classes[draggedFb].classes[draggedRid].sem = classes[newNeighborFb].classes[newNeighborRid].sem;
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    return false;
}

function mk_table_row(area_id, row_id, removeable, draggable) {
    var area = classes[area_id];
    var row = area.classes[row_id];

    var row_text = "<tr id='class-"+row_id+"' data-fb='"+area_id+"' data-rid="+row_id+" class='weight-"+get_shade(row.weight)+"'><td>"+row.name+"</td>";
    row_text += "<td class='num'><input class='form-control' type='text' maxlength='3' value='"+row.note+"'></td>";
    row_text += "<td class='num'>"+row.weight+"</td>";
    if (removeable) {
        row_text += "<td class='del'><a href='#'><i class='fa fa-minus-square'></i></a></td>";
    }
    row_text += "</tr>";

    var tr = $(row_text);
    tr.find("input").change(function(e) {
        area.classes[row_id].note = parseFloat($(this).val());
        update_display();
    });
    tr.find("td.del a").click(function(e) {
        e.preventDefault();
        delete area.classes[row_id];
        tr.remove();
        update_view(sem_view);
        update_display();
    });
    //DRAGGING
    if (draggable) {
        tr.attr('draggable', 'true');
        tr.bind('dragover', cancel);
        tr.bind('dragstart', function(e) {
            this.style.opacity = '0.4';
            e.originalEvent.dataTransfer.effectAllowed = 'move';
            e.originalEvent.dataTransfer.setData('text/plain', this.id);
        });
        tr.bind('dragend', function(e) { this.style.opacity = 1;});
        tr.bind('drop', tr_handle_drop);
    }
    return tr;
}

function mk_input_row(area_id) {
    tr_text = "<tr class='add-class'>";
    tr_text += "<td><input class='name'/></td>";
    tr_text += "<td class='num'><input maxlength=3 class='note form-control'/></td>";
    tr_text += "<td class='num'><input maxlength=1 class='weight form-control'/></td>";
    tr_text += "<td class='add'><a href='#'><i class='fa fa-plus-square'></i></a></td></tr>";
    tr_text += "</tr>";
    var tr = $(tr_text);
    tr.find("input").on("keyup", function(e) {
        e.preventDefault();
        if (e.keyCode == 13) {
            if (check_new(area_id)) {
                update_view(sem_view);
                update_display();
            }
        }
    });
    tr.find("td.add a").click(function(e) {
        e.preventDefault();
        if (check_new(area_id)) {
            update_view(sem_view);
            update_display();
        }
    });
    return tr;
};

//SAVE TO URL
function get_url() {
    var serialized = JSON.stringify(classes);
    serialized = encodeURIComponent(serialized);
    var base_url = window.location.protocol + "//" + window.location.host + window.location.pathname;
    var url = base_url+"?save="+serialized+"&sem_view="+sem_view;
    return url;
}

//CONVERT WEIGHT TO CSS
function get_shade(weight) {
    if (weight < 6) {
        return 1;
    } else if (weight < 8) {
        return 2;
    } else if (weight < 10) {
        return 3;
    } else {
        return 4;
    }
}

//ERROR FUNCS
function unmark_error(input) {
    input.removeClass('error');
}

function mark_error(input) {
    input.addClass('error');
}

function update_view(sem_view) {
    $("table:not(#temp)").remove();
    var table = $("table#temp");
    if (sem_view) {
        for(var i = 1; i <= 6; i++) {
            tbody_text = "<tbody id=sem-"+i+" data-sid="+i+">";
            tbody_text += "<tr class='area-title'>";
            tbody_text += "<th colspan='3'>Semester "+i+"</th>";
            tbody_text += "</tr></tbody>";
            var tbody = $(tbody_text);
            tbody.bind('drop', tbody_handle_drop);
            tbody.bind('dragover', cancel);
            table.append(tbody);
        }
        Object.keys(classes).forEach(function(area_id) {
            var area = classes[area_id];
            Object.keys(area.classes).forEach(function(row_id) {
                var row = area.classes[row_id];
                var tr = mk_table_row(area_id, row_id, area.modifiable, true);
                var tbody = $("#sem-"+row.sem);
                tr.appendTo(tbody);
            });
        });
    } else {
        Object.keys(classes).forEach(function(area_id) {
            var area = classes[area_id];
            var display_name = area.name.replace(/-/g," ");
            tbody_text = "<tbody id="+area.name+">";
            tbody_text += "<tr class='area-title'><th colspan='3'>"+display_name+"</th></tr>";
            tbody_text += "</tbody>";
            var new_table = $(tbody_text);
            if(area.modifiable) {
                var tr = mk_input_row(area_id);
                tr.appendTo(new_table);
            }
            table.append(new_table);
            Object.keys(area.classes).forEach(function(row_id) {
                var tr = mk_table_row(area_id, row_id, area.modifiable, false);
                if(area.modifiable) {
                    tr.insertBefore($("#"+area_id+" .add-class"));
                } else {
                    tr.appendTo($("#"+area_id));
                }
            });
        });
    }
    if (sem_view) {
        $("a#switch-view").text("Semester");
    } else {
        $("a#switch-view").text("Fachbereich");
    }
    arrange_tbodies();
}

function create_table(i) {
    var table_text = "<table id=t"+i+" class='classes'>";
    table_text += "<thead><tr>";
    table_text += "<th>Titel</th>";
    table_text += "<th class='num'>Note</th>";
    table_text += "<th class='num'>Gewicht</th>";
    table_text += "<th></th>";
    table_text += "</tr></thead></table>";
    return table_text;
}

function arrange_tbodies() {
    var table_width = $("table#temp").width();
    var table_height = $("table#temp").height();
    var max_height = $(window).height() - $("form").offset().top;
    var max_width = $(window).width();
    var max_num_cols = Math.floor(max_width/table_width);
    if (max_num_cols*max_height < table_height) {
        //even out columns
        max_height = table_height/max_num_cols;
    }
    var i = 1;
    var table = $(create_table(i));
    table.appendTo($("form"));
    $("tbody").each(function(tbody) {
        var tbody = $(this);
        var new_height = table.height() + tbody.height();
        tbody.detach();
        if(new_height > max_height-20 && (i+1)*table_width < max_width) {
            i = i+1;
            table = $(create_table(i));
            table.appendTo($("form"));
        }
        tbody.appendTo(table);
    });
}

function update_display() {
    var notes = calc_note(classes);
    $(".strike").removeClass('strike');
    if (notes.note > 0) {
        display_note(notes.note, notes.strikes.note);
        Object.keys(notes.strikes.strikes).forEach(function(area_id) {
            var ind = notes.strikes.strikes[area_id];
            var tr = $("#class-"+ind);
            tr.addClass('strike');
        });
    }
}

function display_note(note, struck_note) {
    if (note > 0) {
        var note_str;
        if(note != struck_note) {
            note_str = "<span class='strike'>"+note.toFixed(2)+"</span> "+struck_note.toFixed(2);
        } else {
            note_str = note.toFixed(2);
        }
        $("#overall-note").html(note_str);
        $("#overall-note").removeClass('invisible');
    } else {
        $("#overall-note").addClass('invisible');
    }
}

//INIT
$(document).ready(function() {
    if(!load_from_url()) {
        $.getJSON("js/studiengaenge/b_inf.json", function(new_classes) {
            new_classes.forEach(create_area);
            console.log('Loaded default classes');
            update_view(sem_view);
            update_display();
        });
    } else {
        update_view(sem_view);
        update_display();
    }
    $("a#switch-view").click(function(e) {
        e.preventDefault();
        sem_view = !sem_view;
        update_view(sem_view);
        update_display();
    });
    $("a#save").click(function(e) {
        e.preventDefault();
        var url = get_url();
        $("input#url").css('display','inline');
        $("input#url").val(url);
        $("input#url").select();
        var successCopy = document.execCommand('copy');
        console.log("Saved URL to clipboard: "+successCopy);
        $("input#url").addClass('hidden');

    });
});
